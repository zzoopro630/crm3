import { useState, useRef } from 'react'
import * as ExcelJS from 'exceljs'
import { useBulkCreateEmployees } from '@/hooks/useEmployees'
import { Button } from '@/components/ui/button'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Upload, FileSpreadsheet, Loader2, Check, Download, AlertCircle } from 'lucide-react'
import type { CreateEmployeeInput } from '@/types/employee'
import { SECURITY_LEVELS } from '@/types/employee'

interface EmployeeExcelUploadProps {
    isOpen: boolean
    onClose: () => void
}

interface PreviewRow {
    email: string
    fullName: string
    securityLevel: string
    positionName: string
    department: string
    isValid: boolean
    error?: string
}

// 이메일 검증
function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// 보안등급 검증
function isValidSecurityLevel(level: string): boolean {
    return SECURITY_LEVELS.some(sl => sl.value === level.toUpperCase())
}

export function EmployeeExcelUpload({ isOpen, onClose }: EmployeeExcelUploadProps) {
    const bulkCreate = useBulkCreateEmployees()
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

                const email = String(row.getCell(1).value || '').trim()
                const fullName = String(row.getCell(2).value || '').trim()
                const securityLevel = String(row.getCell(3).value || 'F6').trim().toUpperCase()
                const positionName = String(row.getCell(4).value || '').trim()
                const department = String(row.getCell(5).value || '').trim()

                let isValid = true
                const errors: string[] = []

                if (!email) {
                    isValid = false
                    errors.push('이메일 필수')
                } else if (!isValidEmail(email)) {
                    isValid = false
                    errors.push('이메일 형식 오류')
                }

                if (!fullName) {
                    isValid = false
                    errors.push('이름 필수')
                }

                if (securityLevel && !isValidSecurityLevel(securityLevel)) {
                    isValid = false
                    errors.push('보안등급 오류')
                }

                rows.push({
                    email,
                    fullName,
                    securityLevel: isValidSecurityLevel(securityLevel) ? securityLevel : 'F6',
                    positionName,
                    department,
                    isValid,
                    error: errors.join(', '),
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
        const validRows = previewData.filter(row => row.isValid)
        if (validRows.length === 0) {
            alert('업로드할 유효한 데이터가 없습니다')
            return
        }

        setIsProcessing(true)

        try {
            const employees: CreateEmployeeInput[] = validRows.map(row => ({
                email: row.email,
                fullName: row.fullName,
                securityLevel: row.securityLevel as CreateEmployeeInput['securityLevel'],
                positionName: row.positionName || undefined,
                department: row.department || undefined,
            }))

            const res = await bulkCreate.mutateAsync(employees)
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
        const worksheet = workbook.addWorksheet('사원목록')

        worksheet.columns = [
            { header: '이메일*', key: 'email', width: 30 },
            { header: '이름*', key: 'fullName', width: 15 },
            { header: '보안등급', key: 'securityLevel', width: 12 },
            { header: '직급', key: 'positionName', width: 15 },
            { header: '부서', key: 'department', width: 20 },
        ]

        // Add sample rows
        worksheet.addRow({
            email: 'hong@example.com',
            fullName: '홍길동',
            securityLevel: 'F6',
            positionName: 'FC',
            department: '영업1팀',
        })
        worksheet.addRow({
            email: 'kim@example.com',
            fullName: '김철수',
            securityLevel: 'F5',
            positionName: '팀장',
            department: '영업1팀',
        })

        // Add security level reference
        const refSheet = workbook.addWorksheet('보안등급 참조')
        refSheet.columns = [
            { header: '보안등급', key: 'level', width: 10 },
            { header: '직급명', key: 'name', width: 15 },
        ]
        SECURITY_LEVELS.forEach(level => {
            refSheet.addRow({ level: level.value, name: level.label })
        })

        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = '사원등록_템플릿.xlsx'
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

    const getSecurityLevelBadge = (level: string) => {
        const colors: Record<string, string> = {
            F1: 'bg-red-500/10 text-red-500',
            F2: 'bg-orange-500/10 text-orange-500',
            F3: 'bg-yellow-500/10 text-yellow-500',
            F4: 'bg-green-500/10 text-green-500',
            F5: 'bg-blue-500/10 text-blue-500',
            F6: 'bg-zinc-500/10 text-zinc-500',
        }
        return colors[level] || colors.F6
    }

    return (
        <Sheet open={isOpen} onOpenChange={handleClose}>
            <SheetContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="text-zinc-900 dark:text-white">사원 대량 등록</SheetTitle>
                    <SheetDescription>Excel 파일로 여러 사원을 한번에 등록합니다</SheetDescription>
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
                            id="employee-excel-input"
                        />
                        <label htmlFor="employee-excel-input" className="cursor-pointer">
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
                                            <th className="px-3 py-2 text-left">이메일</th>
                                            <th className="px-3 py-2 text-left">이름</th>
                                            <th className="px-3 py-2 text-left">보안등급</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.slice(0, 10).map((row, i) => (
                                            <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                                                <td className="px-3 py-2">
                                                    {row.isValid ? (
                                                        <Check className="h-4 w-4 text-emerald-500" />
                                                    ) : (
                                                        <div className="flex items-center gap-1">
                                                            <AlertCircle className="h-4 w-4 text-red-500" />
                                                            <span className="text-red-500 text-xs">{row.error}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{row.email || '-'}</td>
                                                <td className="px-3 py-2 text-zinc-900 dark:text-white">{row.fullName || '-'}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getSecurityLevelBadge(row.securityLevel)}`}>
                                                        {row.securityLevel}
                                                    </span>
                                                </td>
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
                                업로드 완료: {result.success}명 등록
                            </p>
                            {result.failed > 0 && (
                                <p className="text-red-500 text-sm mt-1">실패: {result.failed}명 (이메일 중복 등)</p>
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
                            {validCount}명 등록
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
