import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeFilter } from "@/components/date-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Download,
  Filter,
  Users,
  Building2,
  Calendar,
  DollarSign,
  Phone,
  Store,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency, formatNumberOnly, useCurrencyStore } from "@/lib/currency";
import type { Owner, Tenant, Shop } from "@shared/schema";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportData {
  leaseId: number;
  ownerId: number | null;
  ownerName: string;
  shopId: number;
  shopLocation: string;
  floor: string;
  tenantId: number;
  tenantName: string;
  phone: string;
  monthlyRent: number;
  recentPaymentAmount: number;
  recentPaymentDate: string | null;
  currentRentDue: number;
  previousRentDue: number;
  currentOutstanding: number;
}

interface ReportResponse {
  data: ReportData[];
  allData: ReportData[];
  totals: {
    totalCurrentRentDue: number;
    totalPreviousRentDue: number;
    totalMonthlyRent: number;
    totalRecentPayments: number;
    totalCurrentOutstanding: number;
  };
  locationTotals: {
    ground: number;
    first: number;
    second: number;
    subedari: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
  };
  filters: {
    ownerId: string;
    ownerName: string;
    tenantId: string;
    shopId: string;
    month: number;
    year: number;
  };
  reportDate: string;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function OwnerTenantReportPage() {
  const { toast } = useToast();
  const { currency } = useCurrencyStore();
  const currentDate = new Date();
  
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [selectedTenant, setSelectedTenant] = useState<string>("all");
  const [selectedShop, setSelectedShop] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>((currentDate.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(currentDate.getFullYear().toString());
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  const formatValue = (val: number) => formatCurrency(val);

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const { data: owners } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const { data: shops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedOwner !== "all") params.append("ownerId", selectedOwner);
    if (selectedTenant !== "all") params.append("tenantId", selectedTenant);
    if (selectedShop !== "all") params.append("shopId", selectedShop);
    params.append("month", selectedMonth);
    params.append("year", selectedYear);
    if (startDate) params.append("startDate", format(startDate, "yyyy-MM-dd"));
    if (endDate) params.append("endDate", format(endDate, "yyyy-MM-dd"));
    params.append("page", currentPage.toString());
    params.append("limit", pageSize.toString());
    return params.toString();
  }, [selectedOwner, selectedTenant, selectedShop, selectedMonth, selectedYear, startDate, endDate, currentPage, pageSize]);

  const { data: report, isLoading } = useQuery<ReportResponse>({
    queryKey: [`/api/reports/owner-tenant-details?${queryString}`],
  });

  const filteredShops = useMemo(() => {
    if (!shops) return [];
    if (selectedOwner === "all") return shops;
    return shops.filter(s => s.ownerId === parseInt(selectedOwner));
  }, [shops, selectedOwner]);

  const filteredTenants = useMemo(() => {
    if (!tenants) return tenants || [];
    return tenants;
  }, [tenants]);

  const years = useMemo(() => {
    const startYear = 2020;
    const endYear = currentDate.getFullYear() + 1;
    return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  }, []);

  const generatePDF = () => {
    if (!report?.allData || report.allData.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Owner Tenant Details Report", pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Owner: ${report.filters.ownerName}`, 14, 25);
    doc.text(`Period: ${monthNames[report.filters.month - 1]} ${report.filters.year}`, 14, 30);
    doc.text(`Report Date: ${new Date(report.reportDate).toLocaleDateString()}`, pageWidth - 14, 25, { align: "right" });
    doc.text(`Total Records: ${report.allData.length}`, pageWidth - 14, 30, { align: "right" });

    const tableData = report.allData.map((row, index) => [
      (index + 1).toString(),
      row.shopLocation,
      row.tenantName,
      row.phone,
      formatNumberOnly(row.monthlyRent || 0),
      row.recentPaymentAmount > 0 ? formatNumberOnly(row.recentPaymentAmount) : "-",
      row.recentPaymentDate || "-",
      formatNumberOnly(row.currentOutstanding || 0),
    ]);

    // Calculate totals for each column
    const columnTotals = report.allData.reduce((acc, row) => ({
      monthlyRent: acc.monthlyRent + (row.monthlyRent || 0),
      recentPayment: acc.recentPayment + (row.recentPaymentAmount || 0),
      currentOutstanding: acc.currentOutstanding + (row.currentOutstanding || 0),
    }), { monthlyRent: 0, recentPayment: 0, currentOutstanding: 0 });

    autoTable(doc, {
      startY: 38,
      head: [[
        "SL",
        "Shop Location",
        "Tenant Name",
        "Phone",
        "Monthly Rent",
        "Recent Payment",
        "Payment Date",
        "Current Due",
      ]],
      body: tableData,
      foot: [[
        "",
        "TOTAL",
        `${report.allData.length} Tenants`,
        "",
        formatNumberOnly(columnTotals.monthlyRent),
        formatNumberOnly(columnTotals.recentPayment),
        "",
        formatNumberOnly(columnTotals.currentOutstanding),
      ]],
      theme: "grid",
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      footStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 38 },
        2: { cellWidth: 38 },
        3: { cellWidth: 28 },
        4: { halign: "right", cellWidth: 28 },
        5: { halign: "right", cellWidth: 28 },
        6: { halign: "center", cellWidth: 25 },
        7: { halign: "right", cellWidth: 30 },
      },
      margin: { top: 38, left: 14, right: 14, bottom: 25 },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.text(
          `Page ${data.pageNumber}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;

    // Check if we need a new page for the summary
    if (finalY > pageHeight - 60) {
      doc.addPage();
      const summaryY = 20;
      drawSummary(doc, summaryY, pageWidth, report);
    } else {
      drawSummary(doc, finalY + 8, pageWidth, report);
    }

    const fileName = `Owner_Tenant_Report_${report.filters.ownerName.replace(/\s+/g, '_')}_${monthNames[report.filters.month - 1]}_${report.filters.year}.pdf`;
    doc.save(fileName);

    toast({ title: "PDF exported successfully" });
  };

  const drawSummary = (doc: jsPDF, startY: number, pageWidth: number, report: ReportResponse) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(14, startY, pageWidth - 14, startY);

    let y = startY + 8;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Rent Collection by Location", 14, y);
    doc.text(`Period: ${monthNames[report.filters.month - 1]} ${report.filters.year}`, pageWidth - 14, y, { align: "right" });
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const locTotals = report.locationTotals || { ground: 0, first: 0, second: 0, subedari: 0 };
    
    doc.text("Ground Floor:", 14, y);
    doc.text(formatNumberOnly(locTotals.ground || 0), 70, y, { align: "right" });
    
    doc.text("1st Floor:", pageWidth / 2, y);
    doc.text(formatNumberOnly(locTotals.first || 0), pageWidth / 2 + 56, y, { align: "right" });
    y += 6;
    
    doc.text("2nd Floor:", 14, y);
    doc.text(formatNumberOnly(locTotals.second || 0), 70, y, { align: "right" });
    
    doc.text("Subedari:", pageWidth / 2, y);
    doc.text(formatNumberOnly(locTotals.subedari || 0), pageWidth / 2 + 56, y, { align: "right" });
    y += 8;
    
    doc.setFont("helvetica", "bold");
    doc.text("Total Collection:", 14, y);
    doc.text(formatNumberOnly(report.totals.totalRecentPayments || 0), 70, y, { align: "right" });
    
    doc.text("Total Outstanding:", pageWidth / 2, y);
    doc.text(formatNumberOnly(report.totals.totalCurrentOutstanding || 0), pageWidth / 2 + 56, y, { align: "right" });
  };

  const resetFilters = () => {
    setSelectedOwner("all");
    setSelectedTenant("all");
    setSelectedShop("all");
    setSelectedMonth((currentDate.getMonth() + 1).toString());
    setSelectedYear(currentDate.getFullYear().toString());
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <FileText className="h-6 w-6" />
            Owner Tenant Details Report
          </h1>
          <p className="text-muted-foreground">
            Comprehensive report of all tenants with rent dues and payment history
          </p>
        </div>
        <Button onClick={generatePDF} disabled={!report?.allData?.length} className="whitespace-nowrap">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Users className="h-3 w-3" />
                Owner
              </label>
              <Select value={selectedOwner} onValueChange={(v) => { setSelectedOwner(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  {owners?.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id.toString()}>
                      {owner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Shop
              </label>
              <Select value={selectedShop} onValueChange={(v) => { setSelectedShop(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Shop" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shops</SelectItem>
                  {filteredShops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id.toString()}>
                      {shop.shopNumber} - {shop.floor === 'ground' ? 'Ground' : shop.floor === 'first' ? '1st' : '2nd'} Floor
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Store className="h-3 w-3" />
                Tenant
              </label>
              <Select value={selectedTenant} onValueChange={(v) => { setSelectedTenant(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  {filteredTenants?.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id.toString()}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Month
              </label>
              <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Year
              </label>
              <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex items-end">
              <Button variant="outline" onClick={resetFilters} className="w-full">
                Reset Filters
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range Filter
            </label>
            <div className="flex gap-2 items-center">
              <DateRangeFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={(d) => { setStartDate(d); setCurrentPage(1); }}
                onEndDateChange={(d) => { setEndDate(d); setCurrentPage(1); }}
                className="flex-1"
              />
              {(startDate || endDate) && (
                <Button variant="ghost" size="sm" onClick={clearDateFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Month Due</p>
                  <p className="text-xl font-semibold text-red-600">
                    {formatValue(report.totals.totalCurrentRentDue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Previous Dues</p>
                  <p className="text-xl font-semibold text-orange-600">
                    {formatValue(report.totals.totalPreviousRentDue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Period Received</p>
                  <p className="text-xl font-semibold text-green-600">
                    {formatValue(report.totals.totalRecentPayments)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Monthly Rent</p>
                  <p className="text-xl font-semibold text-blue-600">
                    {formatValue(report.totals.totalMonthlyRent)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Tenant Details
              {report && (
                <Badge variant="secondary" className="ml-2">
                  {report.pagination.totalRecords} records
                </Badge>
              )}
            </CardTitle>
            {report && (
              <p className="text-sm text-muted-foreground">
                {report.filters.ownerName} - {monthNames[report.filters.month - 1]} {report.filters.year}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : report?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="font-medium">No data found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12 text-center">SL</TableHead>
                      <TableHead>Shop Location</TableHead>
                      <TableHead>Tenant Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Monthly Rent</TableHead>
                      <TableHead className="text-right">Recent Payment</TableHead>
                      <TableHead className="text-center">Payment Date</TableHead>
                      <TableHead className="text-right">Current Due</TableHead>
                      <TableHead className="text-right">Previous Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report?.data?.map((row, index) => (
                      <TableRow key={row.leaseId}>
                        <TableCell className="text-center font-medium">
                          {(report.pagination.page - 1) * report.pagination.limit + index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-muted-foreground" />
                            {row.shopLocation}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{row.tenantName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {row.phone}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatValue(row.monthlyRent)}</TableCell>
                        <TableCell className="text-right">
                          {row.recentPaymentAmount > 0 ? (
                            <span className="text-green-600">{formatValue(row.recentPaymentAmount)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.recentPaymentDate || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.currentRentDue > 0 ? (
                            <span className="text-red-600 font-medium">{formatValue(row.currentRentDue)}</span>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Paid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.previousRentDue > 0 ? (
                            <span className="text-orange-600 font-medium">{formatValue(row.previousRentDue)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {report && report.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(report.pagination.page - 1) * report.pagination.limit + 1} to{" "}
                    {Math.min(report.pagination.page * report.pagination.limit, report.pagination.totalRecords)} of{" "}
                    {report.pagination.totalRecords} entries
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, report.pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (report.pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= report.pagination.totalPages - 2) {
                          pageNum = report.pagination.totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(p => Math.min(report.pagination.totalPages, p + 1))}
                          className={currentPage === report.pagination.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
