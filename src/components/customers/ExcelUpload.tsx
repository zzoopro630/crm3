import { useState, useRef } from 'react'
import * as ExcelJS from 'exceljs'
import { useBulkCreateCustomers } from '@/hooks/useCustomers'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Upload, FileSpreadsheet, Loader2, Check, Download } from 'lucide-react'
import type { CreateCustomerInput } from '@/types/customer'

interface ExcelUploadProps {
    isOpen: boolean
    onClose: () => void
}

interface PreviewRow {
    name: string
    phone: string
    email: string
    address: string
    gender: string
    company: string
    status: string
    isValid: boolean
    error?: string
}

export function ExcelUpload({ isOpen, onClose }: ExcelUploadProps) {
    const { employee } = useAuthStore()
    const bulkCreate = useBulkCreateCustomers()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [previewData, setPreviewData] = useState<PreviewRow[]>([])
    const [fileName, setFileName] = useState<string>('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [result, setResult] = useState<{ success: number; failed: number } | null>(null)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setFileName(file.name)
        setIsProcessing(true)
        setResult(null)

        try {
            const buffer = await file.arrayBuffer()
            const workbook = new ExcelJS.Workbook()
            await workbook.xlsx.load(buffer)

            const worksheet = workbook.worksheets[0]
            if (!worksheet) {
                throw new Error('워크시트를 찾을 수 없습니다')
            }

            const rows: PreviewRow[] = []

            worksheet.eachRow((row, rowNumber) => {
                // Skip header row
                if (rowNumber === 1) return

                const name = String(row.getCell(1).value || '').trim()
                const phone = String(row.getCell(2).value || '').trim()
                const email = String(row.getCell(3).value || '').trim()
                const address = String(row.getCell(4).value || '').trim()
                const gender = String(row.getCell(5).value || '').trim()
                const company = String(row.getCell(6).value || '').trim()
                const status = String(row.getCell(7).value || 'new').trim()

                let isValid = true
                let error = ''

                if (!name) {
                    isValid = false
                    error = '이름 필수'
                }

                rows.push({
                    name,
                    phone,
                    email,
                    address,
                    gender,
                    company,
                    status,
                    isValid,
                    error,
                })
            })

            setPreviewData(rows)
        } catch (error) {
            console.error('Excel parsing error:', error)
            alert('Excel 파일을 읽는 중 오류가 발생했습니다')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleUpload = async () => {
        if (!employee) return

        const validRows = previewData.filter(row => row.isValid)
        if (validRows.length === 0) {
            alert('업로드할 유효한 데이터가 없습니다')
            return
        }

        setIsProcessing(true)

        try {
            const customers: CreateCustomerInput[] = validRows.map(row => ({
                name: row.name,
                phone: row.phone || undefined,
                email: row.email || undefined,
                address: row.address || undefined,
                gender: row.gender || undefined,
                company: row.company || undefined,
                status: row.status || 'new',
            }))

            const res = await bulkCreate.mutateAsync({
                customers,
                managerId: employee.id,
            })

            setResult(res)
        } catch (error) {
            console.error('Upload error:', error)
            alert('업로드 중 오류가 발생했습니다')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleDownloadTemplate = async () => {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('고객목록')

        worksheet.columns = [
            { header: '이름*', key: 'name', width: 15 },
            { header: '전화번호', key: 'phone', width: 15 },
            { header: '이메일', key: 'email', width: 25 },
            { header: '주소', key: 'address', width: 30 },
            { header: '성별', key: 'gender', width: 10 },
            { header: '회사', key: 'company', width: 20 },
            { header: '상태', key: 'status', width: 10 },
        ]

        // Add sample row
        worksheet.addRow({
            name: '홍길동',
            phone: '010-1234-5678',
            email: 'hong@example.com',
            address: '서울시 강남구',
            gender: '남성',
            company: '테스트회사',
            status: 'new',
        })

        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = '고객등록_템플릿.xlsx'
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleClose = () => {
        setPreviewData([])
        setFileName('')
        setResult(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
        onClose()
    }

    const validCount = previewData.filter(r => r.isValid).length
    const invalidCount = previewData.filter(r => !r.isValid).length

    return (
        <Sheet open={isOpen} onOpenChange={handleClose}>
            <SheetContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="text-zinc-900 dark:text-white">Excel 대량 업로드</SheetTitle>
                    <SheetDescription>Excel 파일로 여러 고객을 한번에 등록합니다</SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    {/* Template Download */}
                    <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        템플릿 다운로드
                    </Button>

                    {/* File Upload */}
                    <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg p-8 text-center">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="excel-input"
                        />
                        <label htmlFor="excel-input" className="cursor-pointer">
                            <FileSpreadsheet className="mx-auto h-12 w-12 text-zinc-400" />
                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                {fileName || 'Excel 파일을 선택하세요 (.xlsx, .xls)'}
                            </p>
                            <Button variant="outline" className="mt-4" asChild>
                                <span>
                                    <Upload className="mr-2 h-4 w-4" />
                                    파일 선택
                                </span>
                            </Button>
                        </label>
                    </div>

                    {/* Preview */}
                    {previewData.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium text-zinc-900 dark:text-white">미리보기</h3>
                                <div className="flex gap-4 text-sm">
                                    <span className="text-emerald-500">유효: {validCount}</span>
                                    <span className="text-red-500">오류: {invalidCount}</span>
                                </div>
                            </div>

                            <div className="overflow-x-auto max-h-64 border rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left">상태</th>
                                            <th className="px-3 py-2 text-left">이름</th>
                                            <th className="px-3 py-2 text-left">전화번호</th>
                                            <th className="px-3 py-2 text-left">이메일</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.slice(0, 10).map((row, i) => (
                                            <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                                                <td className="px-3 py-2">
                                                    {row.isValid ? (
                                                        <Check className="h-4 w-4 text-emerald-500" />
                                                    ) : (
                                                        <span className="text-red-500 text-xs">{row.error}</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-zinc-900 dark:text-white">{row.name || '-'}</td>
                                                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{row.phone || '-'}</td>
                                                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{row.email || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {previewData.length > 10 && (
                                    <p className="text-center py-2 text-sm text-zinc-500">
                                        ... 외 {previewData.length - 10}건
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                            <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                                업로드 완료: {result.success}건 등록
                            </p>
                            {result.failed > 0 && (
                                <p className="text-red-500 text-sm mt-1">실패: {result.failed}건</p>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleClose} className="flex-1">
                            닫기
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={validCount === 0 || isProcessing || result !== null}
                            className="flex-1"
                        >
                            {isProcessing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="mr-2 h-4 w-4" />
                            )}
                            {validCount}건 업로드
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
