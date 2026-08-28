import * as XLSX from 'xlsx'
import * as crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { Decimal } from '@prisma/client/runtime/library'

export type ImportRowStatus = 'OK' | 'DUPLICATE' | 'REVIEW_REQUIRED' | 'ERROR'

export interface ParsedRow {
  rowIndex:    number
  date:        string | null
  description: string | null
  amount:      number | null
  type:        'INCOME' | 'EXPENSE' | null
  category:    string | null
  account:     string | null
  reference:   string | null
  status:      ImportRowStatus
  warnings:    string[]
  raw:         Record<string, unknown>
}

export interface ImportPreview {
  fileName:   string
  fileHash:   string
  totalRows:  number
  incomeRows: number
  expenseRows: number
  reviewRows: number
  errorRows:  number
  rows:       ParsedRow[]
  isDuplicate: boolean
}

function parseDate(raw: unknown): string | null {
  if (!raw) return null
  if (raw instanceof Date) return raw.toISOString().slice(0, 10)
  const str = String(raw).trim()

  // Excel serial date
  const serial = Number(str)
  if (!isNaN(serial) && serial > 1000) {
    const d = XLSX.SSF.parse_date_code(serial)
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  }

  // Try parsing common Spanish formats: DD/MM/YYYY, DD-MM-YYYY
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (match) {
    const [, d, m, y] = match
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }

  const date = new Date(str)
  if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10)

  return null
}

function parseAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const n = Number(String(raw).replace(/[,$\s]/g, ''))
  return isNaN(n) ? null : Math.abs(n)
}

function detectType(raw: unknown, amount: unknown): 'INCOME' | 'EXPENSE' | null {
  const str = String(raw ?? '').toLowerCase()
  if (str.includes('ingreso') || str.includes('cobro') || str.includes('pago recibido')) return 'INCOME'
  if (str.includes('gasto') || str.includes('pago') || str.includes('egreso')) return 'EXPENSE'
  const n = Number(String(amount ?? '').replace(/[,$\s]/g, ''))
  if (n < 0) return 'EXPENSE'
  if (n > 0) return 'INCOME'
  return null
}

export const importService = {
  computeFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex')
  },

  async parseAndPreview(buffer: Buffer, fileName: string, workspaceId: string): Promise<ImportPreview> {
    const fileHash = importService.computeFileHash(buffer)

    // Check for duplicate batch
    const existing = await prisma.importBatch.findUnique({ where: { fileHash } })
    if (existing && existing.status === 'COMPLETED') {
      return {
        fileName, fileHash, totalRows: existing.totalRows,
        incomeRows: 0, expenseRows: 0, reviewRows: 0, errorRows: 0,
        rows: [], isDuplicate: true,
      }
    }

    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet     = workbook.Sheets[sheetName]
    const rawRows   = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    const rows: ParsedRow[] = rawRows.map((raw, idx) => {
      const warnings: string[] = []

      // Try common column name variants
      const dateRaw   = raw['Fecha'] ?? raw['fecha'] ?? raw['DATE'] ?? raw['date'] ?? raw['Día'] ?? null
      const descRaw   = raw['Descripción'] ?? raw['Description'] ?? raw['descripcion'] ?? raw['Concepto'] ?? raw['concepto'] ?? null
      const amountRaw = raw['Monto'] ?? raw['monto'] ?? raw['Amount'] ?? raw['Importe'] ?? raw['importe'] ?? raw['Valor'] ?? null
      const typeRaw   = raw['Tipo'] ?? raw['tipo'] ?? raw['Type'] ?? null
      const catRaw    = raw['Categoría'] ?? raw['Categoria'] ?? raw['categoria'] ?? raw['Category'] ?? null
      const accRaw    = raw['Cuenta'] ?? raw['cuenta'] ?? raw['Account'] ?? null
      const refRaw    = raw['Referencia'] ?? raw['referencia'] ?? raw['Ref'] ?? null

      const date      = parseDate(dateRaw)
      const amount    = parseAmount(amountRaw)
      const type      = detectType(typeRaw, amountRaw)
      const description = descRaw ? String(descRaw).trim() : null

      if (!date)        warnings.push('Fecha inválida o no encontrada')
      if (!amount)      warnings.push('Monto inválido o no encontrado')
      if (!description) warnings.push('Descripción vacía')
      if (!type)        warnings.push('Tipo de transacción no determinado')

      let status: ImportRowStatus = 'OK'
      if (warnings.length > 2)                                     status = 'ERROR'
      else if (!type || (!date && !amount) || (!description && !type)) status = 'REVIEW_REQUIRED'
      else if (warnings.length > 0)                                status = 'REVIEW_REQUIRED'

      return {
        rowIndex: idx + 2,
        date,
        description,
        amount,
        type,
        category:  catRaw ? String(catRaw).trim() : null,
        account:   accRaw ? String(accRaw).trim() : null,
        reference: refRaw ? String(refRaw).trim() : null,
        status,
        warnings,
        raw,
      }
    })

    return {
      fileName,
      fileHash,
      totalRows:   rows.length,
      incomeRows:  rows.filter(r => r.type === 'INCOME').length,
      expenseRows: rows.filter(r => r.type === 'EXPENSE').length,
      reviewRows:  rows.filter(r => r.status === 'REVIEW_REQUIRED').length,
      errorRows:   rows.filter(r => r.status === 'ERROR').length,
      rows,
      isDuplicate: false,
    }
  },

  async executeImport(preview: ImportPreview, workspaceId: string, options: {
    accountId:   string
    categoryId:  string
    createdById?: string
    skipReview:  boolean
  }) {
    const { accountId, categoryId, createdById, skipReview } = options

    // Create batch record
    const batch = await prisma.importBatch.create({
      data: {
        workspaceId,
        fileName:   preview.fileName,
        fileHash:   preview.fileHash,
        status:     'PROCESSING',
        totalRows:  preview.totalRows,
        createdById: createdById ?? null,
      },
    })

    const rowsToImport = preview.rows.filter(r =>
      r.status === 'OK' || (r.status === 'REVIEW_REQUIRED' && skipReview ? false : r.status === 'OK')
    )

    let imported = 0; let skipped = 0; let errors = 0

    for (const row of rowsToImport) {
      if (!row.date || !row.amount || !row.type) { skipped++; continue }

      try {
        await prisma.transaction.create({
          data: {
            workspaceId,
            accountId,
            categoryId,
            type:            row.type,
            amount:          new Decimal(row.amount),
            description:     row.description ?? `Fila ${row.rowIndex} importada`,
            transactionDate: new Date(row.date),
            status:          'COMPLETED',
            reference:       row.reference ?? null,
            sourceType:      'IMPORT',
            sourceId:        batch.id,
            createdById:     createdById ?? null,
          },
        })
        imported++
      } catch {
        errors++
      }
    }

    const updated = await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status:     errors > 0 && imported === 0 ? 'FAILED' : errors > 0 ? 'PARTIAL' : 'COMPLETED',
        imported,
        skipped:    preview.totalRows - imported - errors,
        errors,
        importedAt: new Date(),
        summary:    {
          totalRows: preview.totalRows,
          incomeRows: preview.incomeRows,
          expenseRows: preview.expenseRows,
          reviewRows: preview.reviewRows,
          imported,
          skipped,
          errors,
        },
      },
    })

    return { batch: updated, imported, skipped, errors }
  },

  async listBatches(workspaceId: string) {
    return prisma.importBatch.findMany({
      where:   { workspaceId },
      orderBy: { createdAt: 'desc' },
      take:    20,
    })
  },
}
