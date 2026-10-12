import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  ArrowLeft,
  Package,
  Store,
  MapPin,
  Clock,
  CheckCircle,
  Truck,
  Phone,
  RefreshCw,
  PartyPopper,
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  DollarSign,
  Calendar,
  Layers,
  ChevronRight,
  Info,
  Check,
} from 'lucide-react-native';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { apiClient } from '../api/apiClient';
import RefreshableScrollView from '../components/ui/RefreshableScrollView';
import { ImageEnlargerModal } from '../components/ImageEnlargerModal';

export default function ReceivedOrdersScreen() {
  const { showSuccess, showError } = useToast();
  const { userData } = useApp();
  const params = useLocalSearchParams<{ shopId?: string; shopName?: string; tab?: string }>();

  // Active view tab: 'received' | 'delivered' | 'audit'
  const initialTab = (params.tab === 'delivered' || params.tab === 'audit' || params.tab === 'received')
    ? params.tab
    : 'received';
  const [activeTab, setActiveTab] = useState<'received' | 'delivered' | 'audit'>(initialTab);

  // Sync if params.tab changes dynamically
  useEffect(() => {
    if (params.tab === 'delivered' || params.tab === 'audit' || params.tab === 'received') {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [listedProductsCount, setListedProductsCount] = useState<number>(0);

  // Shop details
  const [activeShopName, setActiveShopName] = useState<string>(
    params.shopName || 'Store'
  );
  const [activeShopId, setActiveShopId] = useState<string | undefined>(params.shopId);

  // Image enlarger lightbox modal
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; title: string } | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  const fetchReceivedOrders = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      // If shopId was passed in params, use it; otherwise fetch using 'my-shop'
      let targetShopId = activeShopId || params.shopId;

      try {
        const shopRes = await apiClient.get('/shops/my-shop');
        if (shopRes.data?.shop) {
          targetShopId = shopRes.data.shop.id;
          setActiveShopId(targetShopId);
          setActiveShopName(shopRes.data.shop.name || 'Store');
          if (Array.isArray(shopRes.data.shop.products)) {
            setListedProductsCount(shopRes.data.shop.products.length);
          }
        }
      } catch (sErr) {
        console.warn('Could not auto-fetch my-shop:', sErr);
      }

      const endpoint = targetShopId ? `/orders/shop/${targetShopId}` : '/orders/shop/my-shop';
      const res = await apiClient.get(endpoint);

      if (res.data?.orders) {
        setOrders(res.data.orders);
      }
    } catch (e: any) {
      console.warn('Could not load received orders:', e);
      showError('Could not load received orders. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReceivedOrders();
  }, [params.shopId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReceivedOrders(true);
  };

  const handleDispatchOrder = async (orderId: string) => {
    try {
      setDispatchingId(orderId);
      const res = await apiClient.patch(`/orders/${orderId}/dispatch`);

      if (res.data?.success) {
        showSuccess('Order marked as Dispatched! 🚚 Customer will now see the Order Received button.');
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, orderStatus: 'DISPATCHED' } : o
          )
        );
      }
    } catch (e: any) {
      console.error('Error dispatching order:', e);
      showError(e.response?.data?.error || 'Failed to dispatch order');
    } finally {
      setDispatchingId(null);
    }
  };

  const handleCallCustomer = (phone?: string) => {
    if (!phone) {
      Alert.alert('Phone not provided', 'Customer did not provide a contact phone number.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call on this device.');
    });
  };

  // Separate Active Received Orders vs Delivered Orders
  const activeReceivedOrders = useMemo(() => {
    return orders.filter((o) => o.orderStatus !== 'DELIVERED');
  }, [orders]);

  const deliveredOrders = useMemo(() => {
    return orders.filter((o) => o.orderStatus === 'DELIVERED');
  }, [orders]);

  // Analytics & ITR Calculations with Daily Sum
  const analytics = useMemo(() => {
    const now = new Date();
    const nowMs = now.getTime();
    const todayDateString = now.toDateString();

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
    const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;
    const ONE_YEAR_MS = 365 * ONE_DAY_MS;

    let totalRevenue = 0;
    let dailySum = 0; // Today's sum
    let weeklySum = 0;
    let monthlySum = 0;
    let yearlySum = 0;

    let totalTurnaroundDays = 0;
    let deliveredCount = 0;

    // Itemized Ledger array
    const ledgerItems: Array<{
      orderId: string;
      date: string;
      dateObj: Date;
      customerName: string;
      customerPhone: string;
      customerAddress: string;
      productName: string;
      quantity: number;
      price: number;
      itemTotal: number;
      estimatedProfit: number;
      status: string;
      turnaroundDays: string;
    }> = [];

    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt || nowMs);
      const ageMs = nowMs - orderDate.getTime();
      const amount = Number(order.totalAmount || 0);

      totalRevenue += amount;

      // Daily Sum: Check if order date matches today's date
      if (orderDate.toDateString() === todayDateString) {
        dailySum += amount;
      }

      if (ageMs <= SEVEN_DAYS_MS) weeklySum += amount;
      if (ageMs <= THIRTY_DAYS_MS) monthlySum += amount;
      if (ageMs <= ONE_YEAR_MS) yearlySum += amount;

      // Turnaround calculation for delivered orders
      let turnaroundText = 'In Progress';
      if (order.orderStatus === 'DELIVERED') {
        const completedDate = new Date(order.updatedAt || order.createdAt);
        const diffMs = Math.max(0, completedDate.getTime() - orderDate.getTime());
        const days = diffMs / ONE_DAY_MS;
        totalTurnaroundDays += days;
        deliveredCount += 1;
        turnaroundText = days < 0.5 ? 'Same Day' : `${days.toFixed(1)} days`;
      }

      // Parse items
      let itemsList: any[] = [];
      try {
        itemsList = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
      } catch (e) {
        itemsList = [];
      }

      if (itemsList.length === 0) {
        const estProfit = Math.round(amount * 0.22); // ~22% average retail merchant margin
        ledgerItems.push({
          orderId: order.id,
          date: orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          dateObj: orderDate,
          customerName: order.userName || 'Customer',
          customerPhone: order.userPhone || 'N/A',
          customerAddress: order.userAddress || 'Local Area',
          productName: 'Store Order Items',
          quantity: 1,
          price: amount,
          itemTotal: amount,
          estimatedProfit: estProfit,
          status: order.orderStatus || 'PLACED',
          turnaroundDays: turnaroundText,
        });
      } else {
        itemsList.forEach((it) => {
          const qty = Number(it.quantity || 1);
          const pr = Number(it.price || 0);
          const tot = Number(it.itemTotal || pr * qty);
          const estProfit = Math.round(tot * 0.22);

          ledgerItems.push({
            orderId: order.id,
            date: orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            dateObj: orderDate,
            customerName: order.userName || 'Customer',
            customerPhone: order.userPhone || 'N/A',
            customerAddress: order.userAddress || 'Local Area',
            productName: it.productName || it.name || 'Store Item',
            quantity: qty,
            price: pr,
            itemTotal: tot,
            estimatedProfit: estProfit,
            status: order.orderStatus || 'PLACED',
            turnaroundDays: turnaroundText,
          });
        });
      }
    });

    // Avg turnaround days
    const avgTurnaroundDays = deliveredCount > 0 ? (totalTurnaroundDays / deliveredCount).toFixed(1) : '1.0';

    // Orders per day
    let ordersPerDay = '0.0';
    if (orders.length > 0) {
      const dates = orders.map((o) => new Date(o.createdAt || nowMs).getTime());
      const oldestDate = Math.min(...dates);
      const spanDays = Math.max(1, (nowMs - oldestDate) / ONE_DAY_MS);
      ordersPerDay = (orders.length / spanDays).toFixed(1);
    }

    // Estimated profit (22% standard retail net gross)
    const estimatedTotalProfit = Math.round(totalRevenue * 0.22);
    const estimatedLoss = 0; // Standard UPI direct settlement, no bad debt

    return {
      totalRevenue,
      dailySum,
      weeklySum,
      monthlySum,
      yearlySum,
      avgTurnaroundDays,
      ordersPerDay,
      estimatedTotalProfit,
      estimatedLoss,
      ledgerItems,
    };
  }, [orders]);

  // Export to CSV Function with Daily Sum
  const handleExportCSV = async () => {
    try {
      setExporting(true);

      const header = [
        'Order ID',
        'Date',
        'Customer Name',
        'Customer Phone',
        'Product Name',
        'Quantity',
        'Unit Price (INR)',
        'Total Amount (INR)',
        'Est Profit (INR)',
        'Turnaround Days',
        'Status',
      ].join(',');

      const rows = analytics.ledgerItems.map((item) => {
        const clean = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
        return [
          clean(item.orderId),
          clean(item.date),
          clean(item.customerName),
          clean(item.customerPhone),
          clean(item.productName),
          item.quantity,
          item.price,
          item.itemTotal,
          item.estimatedProfit,
          clean(item.turnaroundDays),
          clean(item.status),
        ].join(',');
      });

      const summaryRows = [
        '',
        '--- ITR TAX FILING & ACCOUNTING AUDIT SUMMARY ---',
        `"Store Name",${JSON.stringify(activeShopName)}`,
        `"Catalog Items Listed",${listedProductsCount}`,
        `"Orders Per Day Rate",${analytics.ordersPerDay}`,
        `"Avg Delivery Turnaround",${analytics.avgTurnaroundDays} days`,
        `"Daily Sum (Today) (INR)",${analytics.dailySum}`,
        `"Weekly Sum (Last 7 Days) (INR)",${analytics.weeklySum}`,
        `"Monthly Sum (Last 30 Days) (INR)",${analytics.monthlySum}`,
        `"Yearly Sum (FY To Date) (INR)",${analytics.yearlySum}`,
        `"Gross Sales Revenue (INR)",${analytics.totalRevenue}`,
        `"Estimated Net Profit (INR)",${analytics.estimatedTotalProfit}`,
        `"Estimated Loss / Bad Debt (INR)",0`,
        `"Export Generated On",${new Date().toISOString()}`,
      ];

      const csvContent = [header, ...rows, ...summaryRows].join('\n');
      const filename = `ITR_Sales_Report_${activeShopName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;
      const fileUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export ITR Sales CSV Report',
          UTI: 'public.comma-separated-values-text',
        });
        showSuccess('CSV Report saved & ready to download! 📊');
      } else {
        Alert.alert('File Saved', `Report saved at: ${fileUri}`);
      }
    } catch (e: any) {
      console.error('Error exporting CSV:', e);
      showError('Failed to generate CSV file: ' + (e.message || 'Error'));
    } finally {
      setExporting(false);
    }
  };

  // Export to XLS (Excel) Function with Daily Sum
  const handleExportXLS = async () => {
    try {
      setExporting(true);

      // Construct standard Excel XML / HTML Spreadsheet
      const tableRowsHtml = analytics.ledgerItems
        .map(
          (it) => `
        <tr>
          <td>${it.orderId}</td>
          <td>${it.date}</td>
          <td>${it.customerName}</td>
          <td>${it.customerPhone}</td>
          <td>${it.productName}</td>
          <td align="right">${it.quantity}</td>
          <td align="right">${it.price}</td>
          <td align="right">${it.itemTotal}</td>
          <td align="right">${it.estimatedProfit}</td>
          <td>${it.turnaroundDays}</td>
          <td>${it.status}</td>
        </tr>`
        )
        .join('');

      const xlsContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>ITR Audit Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    th { background-color: #2563eb; color: #ffffff; font-weight: bold; padding: 6px 12px; }
    td { padding: 4px 8px; border: 0.5pt solid #cbd5e1; }
    .title { font-size: 16pt; font-weight: bold; color: #1e293b; }
    .kpi { background-color: #f1f5f9; font-weight: bold; }
  </style>
</head>
<body>
  <table>
    <tr><td colspan="11" class="title">CityLinks Merchant ITR & Sales Audit Ledger</td></tr>
    <tr><td colspan="11"><b>Store:</b> ${activeShopName} | <b>Generated:</b> ${new Date().toLocaleString('en-IN')}</td></tr>
    <tr><td colspan="11"></td></tr>
    <tr class="kpi">
      <td colspan="2">Catalog Items Listed:</td><td>${listedProductsCount}</td>
      <td colspan="2">Avg Turnaround:</td><td>${analytics.avgTurnaroundDays} days</td>
      <td colspan="2">Orders / Day:</td><td>${analytics.ordersPerDay}</td>
      <td colspan="2">Daily Sum (Today):</td><td>INR ${analytics.dailySum}</td>
      <td></td>
    </tr>
    <tr class="kpi">
      <td colspan="2">Weekly Sum:</td><td>INR ${analytics.weeklySum}</td>
      <td colspan="2">Monthly Sum:</td><td>INR ${analytics.monthlySum}</td>
      <td colspan="2">Yearly Sum:</td><td>INR ${analytics.yearlySum}</td>
      <td colspan="2">Gross Revenue:</td><td>INR ${analytics.totalRevenue}</td>
    </tr>
    <tr class="kpi">
      <td colspan="2">Estimated Profit:</td><td style="color:#059669">INR ${analytics.estimatedTotalProfit}</td>
      <td colspan="2">Estimated Loss:</td><td>INR 0</td>
      <td colspan="5"></td>
    </tr>
    <tr><td colspan="11"></td></tr>
    <thead>
      <tr>
        <th>Order ID</th>
        <th>Date</th>
        <th>Customer</th>
        <th>Phone</th>
        <th>Product Name</th>
        <th>Quantity</th>
        <th>Unit Price (₹)</th>
        <th>Total Amount (₹)</th>
        <th>Est. Profit (₹)</th>
        <th>Turnaround</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>
</body>
</html>`;

      const filename = `ITR_Financial_Report_${activeShopName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.xls`;
      const fileUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, xlsContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.ms-excel',
          dialogTitle: 'Export ITR Financial XLS Report',
        });
        showSuccess('Excel XLS Report saved & ready to download! 📈');
      } else {
        Alert.alert('File Saved', `Report saved at: ${fileUri}`);
      }
    } catch (e: any) {
      console.error('Error exporting XLS:', e);
      showError('Failed to generate XLS file: ' + (e.message || 'Error'));
    } finally {
      setExporting(false);
    }
  };

  // Helper renderer for an individual order card
  const renderOrderCard = (order: any, isDeliveredSection: boolean = false) => {
    let itemsList: any[] = [];
    try {
      itemsList = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
    } catch (e) {
      itemsList = [];
    }

    const createdDate = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Recent';

    const status = order.orderStatus || 'PLACED';
    const isDispatched = status === 'DISPATCHED';
    const isDelivered = status === 'DELIVERED';
    const isPlaced = status === 'PLACED';
    const isDispatching = dispatchingId === order.id;

    // Delivery turnaround time
    let turnaroundLabel = null;
    if (isDelivered && order.createdAt && order.updatedAt) {
      const start = new Date(order.createdAt).getTime();
      const end = new Date(order.updatedAt).getTime();
      const diffDays = Math.max(0, (end - start) / (24 * 60 * 60 * 1000));
      turnaroundLabel = diffDays < 0.5 ? 'Delivered Same Day ⚡' : `Delivered in ${diffDays.toFixed(1)} days`;
    }

    return (
      <View
        key={order.id}
        className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs mb-3.5"
      >
        {/* Header: Order ID & Status Badges */}
        <View className="flex-row items-start justify-between pb-3 border-b border-slate-100">
          <View className="flex-1 mr-2">
            <View className="flex-row items-center">
              <Package size={15} color={isDeliveredSection ? '#7c3aed' : '#ea580c'} />
              <Text className="font-extrabold text-sm text-slate-900 ml-1.5">
                #{order.id}
              </Text>
            </View>
            <View className="flex-row items-center mt-1">
              <Clock size={11} color="#94a3b8" />
              <Text className="text-[10px] text-slate-400 ml-1">
                {createdDate}
              </Text>
            </View>
          </View>

          {/* Payment & Order Status Badges */}
          <View className="items-end gap-y-1">
            <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-row items-center">
              <CheckCircle size={10} color="#059669" />
              <Text className="text-[9px] font-extrabold text-emerald-700 ml-1">
                PAID VIA UPI
              </Text>
            </View>

            {isDelivered ? (
              <View className="bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full flex-row items-center">
                <PartyPopper size={10} color="#7c3aed" />
                <Text className="text-[9px] font-extrabold text-purple-700 ml-1">
                  DELIVERED 🎉
                </Text>
              </View>
            ) : isDispatched ? (
              <View className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex-row items-center">
                <Truck size={10} color="#2563eb" />
                <Text className="text-[9px] font-extrabold text-blue-700 ml-1">
                  DISPATCHED 🚚
                </Text>
              </View>
            ) : (
              <View className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex-row items-center">
                <Clock size={10} color="#d97706" />
                <Text className="text-[9px] font-extrabold text-amber-700 ml-1">
                  AWAITING DISPATCH
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Turnaround Badge if Delivered */}
        {turnaroundLabel && (
          <View className="bg-purple-50/70 border border-purple-100 rounded-lg px-2.5 py-1 mt-2.5 flex-row items-center">
            <Clock size={11} color="#7c3aed" />
            <Text className="text-[10px] font-bold text-purple-700 ml-1.5">
              Turnaround: {turnaroundLabel}
            </Text>
          </View>
        )}

        {/* Customer Contact & Delivery Details */}
        <View className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 my-2.5">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs font-bold text-slate-800">
              👤 Customer: {order.userName || 'Customer'}
            </Text>
            {order.userPhone ? (
              <TouchableOpacity
                onPress={() => handleCallCustomer(order.userPhone)}
                activeOpacity={0.7}
                className="flex-row items-center bg-emerald-100/80 px-2 py-1 rounded-lg border border-emerald-300"
              >
                <Phone size={11} color="#047857" />
                <Text className="text-[10px] font-bold text-emerald-800 ml-1">
                  {order.userPhone}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View className="flex-row items-start mt-1">
            <MapPin size={13} color="#ea580c" style={{ marginTop: 2, marginRight: 5 }} />
            <View className="flex-1">
              <Text className="text-[11px] text-slate-700 font-medium leading-4">
                {order.userAddress || 'Haveri, Karnataka'}
              </Text>
              {order.userLatitude && order.userLongitude ? (
                <Text className="text-[9px] text-slate-400 mt-0.5">
                  GPS: {Number(order.userLatitude).toFixed(4)}, {Number(order.userLongitude).toFixed(4)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Ordered Products Items List with Photo Thumbnail & Enlarge Feature */}
        <View className="mb-2.5">
          <Text className="text-xs font-bold text-slate-700 mb-2">
            Items Ordered ({itemsList.length}):
          </Text>
          {itemsList.map((item, idx) => (
            <View
              key={idx}
              className="flex-row items-center justify-between py-2 border-b border-slate-100 last:border-b-0"
            >
              {/* Product Photo Thumbnail with Enlarge Feature */}
              <TouchableOpacity
                activeOpacity={item.imageUrl ? 0.7 : 1}
                onPress={() => {
                  if (item.imageUrl) {
                    setEnlargedImage({
                      url: item.imageUrl,
                      title: item.productName || item.name || 'Product',
                    });
                  }
                }}
                className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden mr-2.5 border border-slate-200 items-center justify-center relative"
              >
                {item.imageUrl ? (
                  <>
                    <Image
                      source={{ uri: item.imageUrl }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                    <View className="absolute bottom-0.5 right-0.5 bg-black/60 rounded px-0.5">
                      <Text className="text-[7px] text-white">🔍</Text>
                    </View>
                  </>
                ) : (
                  <Package size={16} color="#94a3b8" />
                )}
              </TouchableOpacity>

              <View className="flex-1 mr-2">
                <Text className="text-xs text-slate-800 font-bold" numberOfLines={1}>
                  {item.productName || item.name || 'Product'}
                </Text>
                <Text className="text-[10px] text-slate-500 mt-0.5">
                  Qty: {item.quantity || 1} × ₹{item.price || 0}
                </Text>
              </View>

              <Text className="text-xs font-bold text-slate-900">
                ₹{item.itemTotal || (item.price || 0) * (item.quantity || 1)}
              </Text>
            </View>
          ))}
        </View>

        {/* Financial summary */}
        <View className="flex-row items-center justify-between py-2 border-t border-slate-100 mb-2">
          <Text className="text-xs text-slate-500 font-medium">
            Total Amount Received:
          </Text>
          <Text className="text-base font-black text-emerald-700">
            ₹{order.totalAmount}
          </Text>
        </View>

        {/* Action Area: DISPATCHED ORDER BUTTON (Only for active placed orders) */}
        {isPlaced && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleDispatchOrder(order.id)}
            disabled={isDispatching}
            style={{
              backgroundColor: '#ea580c',
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              shadowColor: '#ea580c',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            {isDispatching ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Truck size={17} color="#ffffff" strokeWidth={2.2} />
                <Text
                  style={{
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: 13,
                    marginLeft: 8,
                  }}
                >
                  Dispatched Order
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isDispatched && (
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex-row items-center justify-center">
            <Truck size={16} color="#2563eb" />
            <Text className="text-xs font-bold text-blue-800 ml-2">
              Order Dispatched 🚚 (Awaiting Customer Receipt)
            </Text>
          </View>
        )}

        {isDelivered && (
          <View className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex-row items-center justify-center">
            <PartyPopper size={16} color="#7c3aed" />
            <Text className="text-xs font-bold text-purple-800 ml-2">
              Delivered & Confirmed by Customer 🎉
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView edges={['top']} className="bg-white">
        {/* Top Navigation Bar with Logo + Title */}
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <View className="flex-row items-center">
            <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()}>
              <Image
                source={require('../assets/images/logo.png')}
                style={{ width: 36, height: 36 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <View className="ml-2.5">
              <View className="flex-row items-center">
                <Text className="text-lg font-extrabold text-slate-900 tracking-tight">
                  {activeTab === 'received'
                    ? 'Received Orders'
                    : activeTab === 'delivered'
                    ? 'Delivered Orders'
                    : 'ITR & Financial Ledger'}
                </Text>
                <View className="bg-orange-100 px-2 py-0.5 rounded-full ml-2">
                  <Text className="text-[10px] font-extrabold text-orange-700">
                    SHOP KEEPER
                  </Text>
                </View>
              </View>
              <Text className="text-[11px] text-slate-500 font-medium">
                {activeShopName} • Store Dispatch Center
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleRefresh}
            className="w-9 h-9 rounded-full bg-slate-50 items-center justify-center border border-slate-200"
          >
            <RefreshCw size={16} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* View Mode Segmented Switch Tabs */}
        <View className="flex-row items-center bg-slate-100 p-1 mx-4 my-2.5 rounded-2xl border border-slate-200/80">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('received')}
            className={`flex-1 py-2 rounded-xl items-center justify-center flex-row ${
              activeTab === 'received' ? 'bg-white shadow-2xs' : ''
            }`}
          >
            <Package size={13} color={activeTab === 'received' ? '#ea580c' : '#64748b'} />
            <Text
              className={`text-xs ml-1.5 font-bold ${
                activeTab === 'received' ? 'text-orange-700' : 'text-slate-500'
              }`}
            >
              Received ({activeReceivedOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('delivered')}
            className={`flex-1 py-2 rounded-xl items-center justify-center flex-row ${
              activeTab === 'delivered' ? 'bg-white shadow-2xs' : ''
            }`}
          >
            <CheckCircle size={13} color={activeTab === 'delivered' ? '#7c3aed' : '#64748b'} />
            <Text
              className={`text-xs ml-1.5 font-bold ${
                activeTab === 'delivered' ? 'text-purple-700' : 'text-slate-500'
              }`}
            >
              Delivered ({deliveredOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('audit')}
            className={`flex-1 py-2 rounded-xl items-center justify-center flex-row ${
              activeTab === 'audit' ? 'bg-white shadow-2xs' : ''
            }`}
          >
            <FileSpreadsheet size={13} color={activeTab === 'audit' ? '#2563eb' : '#64748b'} />
            <Text
              className={`text-xs ml-1.5 font-bold ${
                activeTab === 'audit' ? 'text-blue-700' : 'text-slate-500'
              }`}
            >
              ITR Audit
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Main Scrollable Content */}
      <SafeAreaView edges={['bottom']} className="flex-1 bg-[#f8fafc]">
        <RefreshableScrollView
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
          className="flex-1 px-4 pt-2"
        >
          {/* Back Navigation Bar */}
          <View className="flex-row items-center justify-between mb-3">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.back()}
              className="flex-row items-center self-start py-1"
            >
              <ArrowLeft size={17} color="#1e293b" />
              <Text className="ml-2 text-sm font-semibold text-slate-800">
                Back to Dashboard
              </Text>
            </TouchableOpacity>

            <View className="flex-row items-center gap-1.5">
              <View className="bg-orange-100 px-2.5 py-1 rounded-full">
                <Text className="text-orange-800 font-bold text-[11px]">
                  {activeReceivedOrders.length} Pending
                </Text>
              </View>
              <View className="bg-purple-100 px-2.5 py-1 rounded-full">
                <Text className="text-purple-800 font-bold text-[11px]">
                  {deliveredOrders.length} Delivered
                </Text>
              </View>
            </View>
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="large" color="#ea580c" />
              <Text className="text-xs text-slate-500 mt-3 font-semibold">
                Loading orders & ledger records...
              </Text>
            </View>
          ) : (
            <View>
              {/* ============================================================== */}
              {/* SECTION 1: RECEIVED ORDERS (ONLY DISPLAYED WHEN TAB IS 'received') */}
              {/* ============================================================== */}
              {activeTab === 'received' && (
                <View className="mb-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <View className="w-2.5 h-2.5 rounded-full bg-orange-500 mr-2" />
                      <Text className="text-base font-extrabold text-slate-900 tracking-tight">
                        Received Orders
                      </Text>
                      <View className="bg-orange-100 px-2 py-0.5 rounded-full ml-2">
                        <Text className="text-[11px] font-bold text-orange-700">
                          {activeReceivedOrders.length}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[11px] text-slate-500">
                      Awaiting fulfillment
                    </Text>
                  </View>

                  {activeReceivedOrders.length === 0 ? (
                    <View className="bg-white rounded-2xl p-6 border border-slate-200/90 items-center justify-center">
                      <CheckCircle size={36} color="#10b981" />
                      <Text className="text-sm font-bold text-slate-800 mt-2">
                        All Caught Up!
                      </Text>
                      <Text className="text-xs text-slate-400 text-center mt-1">
                        No active pending orders right now. Completed orders are filed under Delivered Orders.
                      </Text>
                    </View>
                  ) : (
                    activeReceivedOrders.map((order) => renderOrderCard(order, false))
                  )}
                </View>
              )}

              {/* ============================================================== */}
              {/* SECTION 2: DELIVERED ORDERS (ONLY DISPLAYED WHEN TAB IS 'delivered') */}
              {/* ============================================================== */}
              {activeTab === 'delivered' && (
                <View className="mb-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <View className="w-2.5 h-2.5 rounded-full bg-purple-600 mr-2" />
                      <Text className="text-base font-extrabold text-slate-900 tracking-tight">
                        Delivered Orders
                      </Text>
                      <View className="bg-purple-100 px-2 py-0.5 rounded-full ml-2">
                        <Text className="text-[11px] font-bold text-purple-700">
                          {deliveredOrders.length}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[11px] text-slate-500">
                      Completed & received
                    </Text>
                  </View>

                  {deliveredOrders.length === 0 ? (
                    <View className="bg-white rounded-2xl p-6 border border-slate-200/90 items-center justify-center">
                      <Package size={34} color="#94a3b8" />
                      <Text className="text-sm font-bold text-slate-700 mt-2">
                        No Delivered Orders Yet
                      </Text>
                      <Text className="text-xs text-slate-400 text-center mt-1">
                        Orders completed and confirmed received by customers will appear in this section.
                      </Text>
                    </View>
                  ) : (
                    deliveredOrders.map((order) => renderOrderCard(order, true))
                  )}
                </View>
              )}

              {/* ============================================================== */}
              {/* SECTION 3: FINANCIAL & ITR TAX AUDIT REPORTING SECTION (TAB 'audit') */}
              {/* ============================================================== */}
              {activeTab === 'audit' && (
                <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs mb-6">
                  {/* Section Header */}
                  <View className="flex-row items-start justify-between pb-3 border-b border-slate-100">
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center">
                        <FileSpreadsheet size={18} color="#2563eb" />
                        <Text className="text-base font-black text-slate-900 ml-1.5">
                          ITR & Financial Ledger Audit
                        </Text>
                      </View>
                      <Text className="text-[11px] text-slate-500 mt-0.5">
                        Store sales, daily/weekly/monthly/yearly sums & tax statement
                      </Text>
                    </View>

                    <View className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      <Text className="text-[9px] font-bold text-blue-700">
                        TAX READY
                      </Text>
                    </View>
                  </View>

                  {/* Key Metrics Grid */}
                  <View className="flex-row flex-wrap gap-2 my-3.5">
                    {/* Listed Items */}
                    <View className="flex-1 min-w-[45%] bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                      <Text className="text-[10px] font-semibold text-slate-500 uppercase">
                        Items Listed
                      </Text>
                      <Text className="text-base font-extrabold text-slate-900 mt-0.5">
                        {listedProductsCount} Products
                      </Text>
                      <Text className="text-[9px] text-slate-400 mt-0.5">Active in Storefront</Text>
                    </View>

                    {/* Avg Fulfillment Days */}
                    <View className="flex-1 min-w-[45%] bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                      <Text className="text-[10px] font-semibold text-slate-500 uppercase">
                        Avg Turnaround
                      </Text>
                      <Text className="text-base font-extrabold text-slate-900 mt-0.5">
                        {analytics.avgTurnaroundDays} Days
                      </Text>
                      <Text className="text-[9px] text-slate-400 mt-0.5">Order to Delivery</Text>
                    </View>

                    {/* Orders Received Per Day */}
                    <View className="flex-1 min-w-[45%] bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                      <Text className="text-[10px] font-semibold text-slate-500 uppercase">
                        Orders / Day
                      </Text>
                      <Text className="text-base font-extrabold text-slate-900 mt-0.5">
                        {analytics.ordersPerDay}
                      </Text>
                      <Text className="text-[9px] text-slate-400 mt-0.5">Avg Velocity Rate</Text>
                    </View>

                    {/* Total Gross Revenue */}
                    <View className="flex-1 min-w-[45%] bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5">
                      <Text className="text-[10px] font-semibold text-emerald-700 uppercase">
                        Gross Revenue
                      </Text>
                      <Text className="text-base font-black text-emerald-800 mt-0.5">
                        ₹{analytics.totalRevenue}
                      </Text>
                      <Text className="text-[9px] text-emerald-600 mt-0.5">Settled via UPI</Text>
                    </View>

                    {/* DAILY SUM (NEW) */}
                    <View className="flex-1 min-w-[45%] bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5">
                      <Text className="text-[9px] font-extrabold text-amber-800 uppercase">
                        Daily Sum (Today)
                      </Text>
                      <Text className="text-base font-black text-amber-900 mt-0.5">
                        ₹{analytics.dailySum}
                      </Text>
                      <Text className="text-[8px] text-amber-600 mt-0.5">Today's Sales</Text>
                    </View>

                    {/* Weekly Sum */}
                    <View className="flex-1 min-w-[45%] bg-blue-50/60 border border-blue-200/60 rounded-xl p-2.5">
                      <Text className="text-[9px] font-bold text-blue-700 uppercase">Weekly Sum</Text>
                      <Text className="text-base font-black text-blue-900 mt-0.5">
                        ₹{analytics.weeklySum}
                      </Text>
                      <Text className="text-[8px] text-blue-500 mt-0.5">Last 7 Days</Text>
                    </View>

                    {/* Monthly Sum */}
                    <View className="flex-1 min-w-[45%] bg-blue-50/60 border border-blue-200/60 rounded-xl p-2.5">
                      <Text className="text-[9px] font-bold text-blue-700 uppercase">Monthly Sum</Text>
                      <Text className="text-base font-black text-blue-900 mt-0.5">
                        ₹{analytics.monthlySum}
                      </Text>
                      <Text className="text-[8px] text-blue-500 mt-0.5">Last 30 Days</Text>
                    </View>

                    {/* Yearly Sum */}
                    <View className="flex-1 min-w-[45%] bg-blue-50/60 border border-blue-200/60 rounded-xl p-2.5">
                      <Text className="text-[9px] font-bold text-blue-700 uppercase">Yearly Sum</Text>
                      <Text className="text-base font-black text-blue-900 mt-0.5">
                        ₹{analytics.yearlySum}
                      </Text>
                      <Text className="text-[8px] text-blue-500 mt-0.5">FY To Date</Text>
                    </View>
                  </View>

                  {/* Profit & Loss Audit Bar */}
                  <View className="bg-slate-900 rounded-xl p-3 mb-3.5 flex-row items-center justify-between">
                    <View className="flex-1 mr-2">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Taxable Net Profit (Estimated ~22%)
                      </Text>
                      <Text className="text-base font-black text-emerald-400 mt-0.5">
                        +₹{analytics.estimatedTotalProfit} Profit
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Loss / Default
                      </Text>
                      <Text className="text-sm font-black text-slate-300 mt-0.5">
                        ₹{analytics.estimatedLoss} (0%)
                      </Text>
                    </View>
                  </View>

                  {/* Tabular Form of All Orders */}
                  <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-xs font-black text-slate-800">
                        Audit Ledger Table ({analytics.ledgerItems.length} Records)
                      </Text>
                      <Text className="text-[10px] text-slate-400">
                        Swipe horizontally to view all cols 👉
                      </Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={true}
                      className="border border-slate-200 rounded-xl overflow-hidden"
                    >
                      <View>
                        {/* Table Header */}
                        <View className="flex-row bg-slate-100 py-2.5 px-3 border-b border-slate-200">
                          <Text className="w-20 text-[10px] font-extrabold text-slate-700">Date</Text>
                          <Text className="w-24 text-[10px] font-extrabold text-slate-700">Order ID</Text>
                          <Text className="w-36 text-[10px] font-extrabold text-slate-700">Product Name</Text>
                          <Text className="w-12 text-[10px] font-extrabold text-slate-700 text-center">Qty</Text>
                          <Text className="w-20 text-[10px] font-extrabold text-slate-700 text-right">Price (₹)</Text>
                          <Text className="w-20 text-[10px] font-extrabold text-slate-700 text-right">Total (₹)</Text>
                          <Text className="w-22 text-[10px] font-extrabold text-slate-700 text-right">Est Profit (₹)</Text>
                          <Text className="w-20 text-[10px] font-extrabold text-slate-700 text-center">Status</Text>
                        </View>

                        {/* Table Body */}
                        {analytics.ledgerItems.length === 0 ? (
                          <View className="py-6 items-center justify-center">
                            <Text className="text-xs text-slate-400">No records found for audit</Text>
                          </View>
                        ) : (
                          analytics.ledgerItems.map((row, idx) => (
                            <View
                              key={idx}
                              className={`flex-row py-2.5 px-3 border-b border-slate-100 items-center ${
                                idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                              }`}
                            >
                              <Text className="w-20 text-[10px] text-slate-600 font-medium">
                                {row.date}
                              </Text>
                              <Text className="w-24 text-[10px] text-slate-800 font-bold" numberOfLines={1}>
                                #{row.orderId.substring(0, 10)}
                              </Text>
                              <Text className="w-36 text-[11px] text-slate-900 font-semibold" numberOfLines={1}>
                                {row.productName}
                              </Text>
                              <Text className="w-12 text-[10px] text-slate-800 text-center font-bold">
                                {row.quantity}
                              </Text>
                              <Text className="w-20 text-[10px] text-slate-700 text-right font-medium">
                                ₹{row.price}
                              </Text>
                              <Text className="w-20 text-[11px] text-slate-900 text-right font-black">
                                ₹{row.itemTotal}
                              </Text>
                              <Text className="w-22 text-[10px] text-emerald-700 text-right font-bold">
                                +₹{row.estimatedProfit}
                              </Text>
                              <View className="w-20 items-center">
                                <View
                                  className={`px-1.5 py-0.5 rounded-full ${
                                    row.status === 'DELIVERED'
                                      ? 'bg-purple-100'
                                      : row.status === 'DISPATCHED'
                                      ? 'bg-blue-100'
                                      : 'bg-amber-100'
                                  }`}
                                >
                                  <Text
                                    className={`text-[8px] font-extrabold ${
                                      row.status === 'DELIVERED'
                                        ? 'text-purple-800'
                                        : row.status === 'DISPATCHED'
                                        ? 'text-blue-800'
                                        : 'text-amber-800'
                                    }`}
                                  >
                                    {row.status}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Export Buttons: CSV and XLS */}
                  <View className="flex-row items-center gap-2.5 pt-2">
                    {/* Export CSV Button */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleExportCSV}
                      disabled={exporting}
                      className="flex-1 bg-emerald-600 py-3 rounded-xl items-center justify-center flex-row shadow-sm"
                    >
                      {exporting ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Download size={15} color="#ffffff" />
                          <Text className="text-white text-xs font-extrabold ml-1.5">
                            Export CSV (.csv)
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Export XLS Button */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleExportXLS}
                      disabled={exporting}
                      className="flex-1 bg-blue-600 py-3 rounded-xl items-center justify-center flex-row shadow-sm"
                    >
                      {exporting ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <FileSpreadsheet size={15} color="#ffffff" />
                          <Text className="text-white text-xs font-extrabold ml-1.5">
                            Export Excel (.xls)
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </RefreshableScrollView>

        {/* Product Image Enlarger Lightbox Modal */}
        <ImageEnlargerModal
          visible={!!enlargedImage}
          imageUrl={enlargedImage?.url || null}
          title={enlargedImage?.title}
          onClose={() => setEnlargedImage(null)}
        />
      </SafeAreaView>
    </View>
  );
}
