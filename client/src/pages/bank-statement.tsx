import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import {
    ArrowLeft,
    FileText,
    Download,
    Filter,
    X,
    Calendar,
    Banknote,
    Receipt,
    TrendingDown,
    Plus,
} from "lucide-react";
// Imports removed for dynamic loading
// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";

interface BankStatementTransaction {
    id: number;
    date: string;
    type: "rent_collection" | "bank_deposit" | "expense" | "additional_payment";
    description: string;
    amount: number;
    tenantName?: string;
    shopNumber?: string;
}

interface BankStatementData {
    data: BankStatementTransaction[];
    totals: {
        totalRentCollections: number;
        totalBankDeposits: number;
        totalExpenses: number;
        totalAdditionalPayments: number;
        netBalance: number;
    };
    owner: {
        id: number;
        name: string;
    };
}

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function BankStatementPage() {
    const [, params] = useRoute("/owners/:id/bank-statement");
    const ownerId = params?.id;

    // Filter state
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedMonth, setSelectedMonth] = useState<string>("all");
    const [selectedYear, setSelectedYear] = useState<string>("all");

    // Build query params
    const queryParams = useMemo(() => {
        const params = new URLSearchParams();
        if (selectedMonth !== "all" && selectedYear !== "all") {
            params.set("month", selectedMonth);
            params.set("year", selectedYear);
        } else if (startDate && endDate) {
            params.set("startDate", startDate);
            params.set("endDate", endDate);
        }
        return params.toString();
    }, [startDate, endDate, selectedMonth, selectedYear]);

    const { data: reportData, isLoading } = useQuery<BankStatementData>({
        queryKey: [`/api/owners/${ownerId}/reports/bank-statement`, queryParams],
        queryFn: async () => {
            const url = queryParams
                ? `/api/owners/${ownerId}/reports/bank-statement?${queryParams}`
                : `/api/owners/${ownerId}/reports/bank-statement`;
            const res = await fetch(url, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch report");
            return res.json();
        },
        enabled: !!ownerId,
    });

    const formatValue = (val: number) => formatCurrency(val);

    // Format number for PDF without currency symbol (to avoid font issues)
    const formatNumber = (val: number) => val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const clearFilters = () => {
        setStartDate("");
        setEndDate("");
        setSelectedMonth("all");
        setSelectedYear("all");
    };

    const hasActiveFilters = startDate || endDate || selectedMonth !== "all" || selectedYear !== "all";

    // Generate years for filter (last 5 years + current)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

    // Export to PDF
    const exportToPDF = async () => {
        if (!reportData) return;

        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");

        const doc = new jsPDF();
        const ownerName = reportData.owner.name;

        // Title
        doc.setFontSize(18);
        doc.text(`Financial Statement Report - ${ownerName}`, 14, 22);

        // Filter info
        doc.setFontSize(10);
        let filterText = "Period: ";
        if (selectedMonth !== "all" && selectedYear !== "all") {
            filterText += `${monthNames[parseInt(selectedMonth) - 1]} ${selectedYear}`;
        } else if (startDate && endDate) {
            filterText += `${startDate} to ${endDate}`;
        } else {
            filterText += "All Time";
        }
        doc.text(filterText, 14, 30);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

        // Table data - use plain numbers without currency symbol
        const tableData = reportData.data.map(t => [
            t.date,
            t.description,
            t.type === "rent_collection" ? formatNumber(t.amount) : "",
            t.type === "bank_deposit" ? formatNumber(t.amount) : "",
            t.type === "expense" ? formatNumber(t.amount) : "",
        ]);

        // Add table
        autoTable(doc, {
            startY: 42,
            head: [["Date", "Description", "Rent Collection", "Bank Deposit", "Expense"]],
            body: tableData,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [59, 130, 246] },
            columnStyles: {
                0: { cellWidth: 24 },
                1: { cellWidth: 80 },
                2: { cellWidth: 28, halign: "right" },
                3: { cellWidth: 28, halign: "right" },
                4: { cellWidth: 28, halign: "right" },
            },
            didParseCell: function (data) {
                if (data.section === 'body') {
                    if (data.column.index === 2 && data.cell.text[0]) {
                        data.cell.styles.textColor = [37, 99, 235]; // Blue
                    }
                    if (data.column.index === 3 && data.cell.text[0]) {
                        data.cell.styles.textColor = [22, 163, 74]; // Green
                    }
                    if (data.column.index === 4 && data.cell.text[0]) {
                        data.cell.styles.textColor = [220, 38, 38]; // Red
                    }
                }
            },
        });

        // Totals
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setTextColor(37, 99, 235);
        doc.text(`Total Rent Collections: ${formatNumber(reportData.totals.totalRentCollections)}`, 14, finalY);
        doc.setTextColor(22, 163, 74);
        doc.text(`Total Bank Deposits: ${formatNumber(reportData.totals.totalBankDeposits)}`, 14, finalY + 6);
        doc.setTextColor(220, 38, 38);
        doc.text(`Total Expenses: ${formatNumber(reportData.totals.totalExpenses)}`, 14, finalY + 12);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(`Net Balance: ${formatNumber(reportData.totals.netBalance)}`, 14, finalY + 20);

        // Save
        doc.save(`financial_statement_${ownerName.replace(/\s+/g, '_')}.pdf`);
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="p-3 md:p-6 space-y-4 md:space-y-6">
            {/* Header - Mobile Optimized */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-4">
                    <Link href={`/owners/${ownerId}`}>
                        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 md:h-10 md:w-10">
                            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
                        </Button>
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-lg md:text-2xl font-semibold flex items-center gap-2">
                            <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                            <span className="truncate">Financial Statement</span>
                        </h1>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">{reportData?.owner.name}</p>
                    </div>
                </div>
                <Button onClick={exportToPDF} disabled={!reportData?.data.length} size="sm" className="shrink-0">
                    <Download className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Export PDF</span>
                </Button>
            </div>

            {/* Filters - Horizontal Scrollable on Mobile */}
            <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
                <div className="flex gap-2 md:gap-3 min-w-max md:min-w-0 md:flex-wrap">
                    <div className="flex items-center gap-1 bg-muted/50 rounded-lg px-2 py-1">
                        <Filter className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Filters:</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setSelectedMonth("all");
                                setSelectedYear("all");
                            }}
                            className="h-8 w-32 text-xs"
                            placeholder="From"
                        />
                        <span className="text-xs text-muted-foreground">-</span>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setSelectedMonth("all");
                                setSelectedYear("all");
                            }}
                            className="h-8 w-32 text-xs"
                            placeholder="To"
                        />
                    </div>
                    <Select
                        value={selectedMonth}
                        onValueChange={(value) => {
                            setSelectedMonth(value);
                            setStartDate("");
                            setEndDate("");
                        }}
                    >
                        <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Months</SelectItem>
                            {monthNames.map((month, index) => (
                                <SelectItem key={index} value={String(index + 1)}>
                                    {month.substring(0, 3)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={selectedYear}
                        onValueChange={(value) => {
                            setSelectedYear(value);
                            setStartDate("");
                            setEndDate("");
                        }}
                    >
                        <SelectTrigger className="h-8 w-24 text-xs">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Years</SelectItem>
                            {years.map((year) => (
                                <SelectItem key={year} value={String(year)}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2">
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary Cards - Only show when filters are active */}
            {hasActiveFilters && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Banknote className="h-4 w-4 text-blue-600" />
                                Rent Collections
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-blue-600">
                                {formatValue(reportData?.totals.totalRentCollections || 0)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Plus className="h-4 w-4 text-purple-600" />
                                Additional Payments
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-purple-600">
                                {formatValue(reportData?.totals.totalAdditionalPayments || 0)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-green-600" />
                                Bank Deposits
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-green-600">
                                {formatValue(reportData?.totals.totalBankDeposits || 0)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-red-600" />
                                Expenses
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-red-600">
                                {formatValue(reportData?.totals.totalExpenses || 0)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Net Balance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className={`text-2xl font-bold ${(reportData?.totals.netBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatValue(reportData?.totals.netBalance || 0)}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Transactions Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Transaction Details
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right text-blue-600">Rent Collection</TableHead>
                                <TableHead className="text-right text-purple-600">Additional Payment</TableHead>
                                <TableHead className="text-right text-green-600">Bank Deposit</TableHead>
                                <TableHead className="text-right text-red-600">Expense</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData?.data.map((transaction) => (
                                <TableRow key={transaction.id}>
                                    <TableCell>{transaction.date}</TableCell>
                                    <TableCell>{transaction.description}</TableCell>
                                    <TableCell className="text-right font-medium text-blue-600">
                                        {transaction.type === "rent_collection" ? formatValue(transaction.amount) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-purple-600">
                                        {transaction.type === "additional_payment" ? formatValue(transaction.amount) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-green-600">
                                        {transaction.type === "bank_deposit" ? formatValue(transaction.amount) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-red-600">
                                        {transaction.type === "expense" ? formatValue(transaction.amount) : "-"}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!reportData?.data || reportData.data.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                        No transactions found for the selected period
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Footer Totals */}
            {reportData && reportData.data.length > 0 && (
                <Card className="border-2">
                    <CardContent className="py-4">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div className="flex gap-8">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Rent Collections</p>
                                    <p className="text-xl font-bold text-blue-600">
                                        {formatValue(reportData.totals.totalRentCollections)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Bank Deposits</p>
                                    <p className="text-xl font-bold text-green-600">
                                        {formatValue(reportData.totals.totalBankDeposits)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                                    <p className="text-xl font-bold text-red-600">
                                        {formatValue(reportData.totals.totalExpenses)}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Net Balance</p>
                                <p className={`text-2xl font-bold ${reportData.totals.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatValue(reportData.totals.netBalance)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
