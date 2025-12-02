import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatCurrency, useCurrencyStore } from "@/lib/currency";
import type { Owner, Tenant, Shop } from "@shared/schema";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportData {
  leaseId: number;
  ownerId: number | null;
  ownerName: string;
  shopId: number;
  shopLocation: string;
  tenantId: number;
  tenantName: string;
  phone: string;
  monthlyRent: number;
  recentPaymentAmount: number;
  recentPaymentDate: string | null;
  currentRentDue: number;
  previousRentDue: number;
}

interface ReportResponse {
  data: ReportData[];
  allData: ReportData[];
  totals: {
    totalCurrentRentDue: number;
    totalPreviousRentDue: number;
    totalMonthlyRent: number;
    totalRecentPayments: number;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  const formatValue = (val: number) => formatCurrency(val);

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
    params.append("page", currentPage.toString());
    params.append("limit", pageSize.toString());
    return params.toString();
  }, [selectedOwner, selectedTenant, selectedShop, selectedMonth, selectedYear, currentPage, pageSize]);

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
      formatValue(row.monthlyRent),
      row.recentPaymentAmount > 0 ? formatValue(row.recentPaymentAmount) : "-",
      row.recentPaymentDate || "-",
      row.currentRentDue > 0 ? formatValue(row.currentRentDue) : "-",
      row.previousRentDue > 0 ? formatValue(row.previousRentDue) : "-",
    ]);

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
        "Previous Due",
      ]],
      body: tableData,
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
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { cellWidth: 28 },
        2: { cellWidth: 28 },
        3: { cellWidth: 20 },
        4: { halign: "right", cellWidth: 20 },
        5: { halign: "right", cellWidth: 20 },
        6: { halign: "center", cellWidth: 20 },
        7: { halign: "right", cellWidth: 20 },
        8: { halign: "right", cellWidth: 20 },
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

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(14, finalY + 5, pageWidth - 14, finalY + 5);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Summary Totals", 14, finalY + 12);

    doc.setFont("helvetica", "normal");
    doc.text(`Total Current Rent Due: ${formatValue(report.totals.totalCurrentRentDue)}`, 14, finalY + 18);
    doc.text(`Total Previous Rent Due: ${formatValue(report.totals.totalPreviousRentDue)}`, 14, finalY + 24);
    doc.text(`Total Received (Selected Period): ${formatValue(report.totals.totalRecentPayments)}`, pageWidth / 2, finalY + 18);
    doc.text(`Total Monthly Rent: ${formatValue(report.totals.totalMonthlyRent)}`, pageWidth / 2, finalY + 24);

    const fileName = `Owner_Tenant_Report_${report.filters.ownerName.replace(/\s+/g, '_')}_${monthNames[report.filters.month - 1]}_${report.filters.year}.pdf`;
    doc.save(fileName);

    toast({ title: "PDF exported successfully" });
  };

  const resetFilters = () => {
    setSelectedOwner("all");
    setSelectedTenant("all");
    setSelectedShop("all");
    setSelectedMonth((currentDate.getMonth() + 1).toString());
    setSelectedYear(currentDate.getFullYear().toString());
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
