const db =
  require('../../config/dbPromise');


// GET EARNINGS
const getEarnings = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { startDate, endDate, type } = req.query;

    // Get driver phone number
    const [drivers] = await db.query(
      'SELECT phone FROM drivers WHERE id = ?',
      [driverId]
    );

    if (drivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
      });
    }
    const driverPhone = drivers[0].phone;

    let extraCondition = '';
    if (type === 'trip') {
      extraCondition = `AND delivery_charges > 0`;
    }
    if (type === 'incentive') {
      extraCondition = `AND delivery_charges = 0`;
    }

    // Query food_orders
    const foodSql = `
      SELECT 
        COUNT(*) AS orders,
        COALESCE(SUM(delivery_charges), 0) AS earnings,
        DAYNAME(created_at) as day,
        DATE(created_at) as order_date
      FROM food_orders
      WHERE driver_mobile = ? AND driver_status = 'order_completed'
      ${extraCondition}
      AND DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
    `;

    // Query ecommerce_orders
    const ecommerceSql = `
      SELECT 
        COUNT(*) AS orders,
        COALESCE(SUM(delivery_charges), 0) AS earnings,
        DAYNAME(created_at) as day,
        DATE(created_at) as order_date
      FROM ecommerce_orders
      WHERE driver_mobile = ? AND driver_status = 'order_completed'
      ${extraCondition}
      AND DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
    `;

    const [[foodRows], [ecommerceRows]] = await Promise.all([
      db.query(foodSql, [driverPhone, startDate, endDate]),
      db.query(ecommerceSql, [driverPhone, startDate, endDate])
    ]);

    // Combine the daily breakdown results
    const dailyBreakdown = {};
    
    const addRawRows = (rows) => {
      for (const row of rows) {
        let dateKey = row.order_date;
        if (dateKey instanceof Date) {
          dateKey = dateKey.toISOString().split('T')[0];
        }
        if (!dailyBreakdown[dateKey]) {
          dailyBreakdown[dateKey] = {
            day: row.day,
            orders: 0,
            earnings: 0
          };
        }
        dailyBreakdown[dateKey].orders += row.orders;
        dailyBreakdown[dateKey].earnings += Number(row.earnings);
      }
    };

    addRawRows(foodRows);
    addRawRows(ecommerceRows);

    let totalTripEarnings = 0;
    let completedOrders = 0;

    for (const key in dailyBreakdown) {
      totalTripEarnings += dailyBreakdown[key].earnings;
      completedOrders += dailyBreakdown[key].orders;
    }

    const [driverData] = await db.query(
      'SELECT login_hours FROM drivers WHERE id = ?',
      [driverId]
    );
    const loginHours = driverData[0]?.login_hours || 0;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    const weekly = days.map((day) => {
      let earnings = 0;
      let orders = 0;
      for (const key in dailyBreakdown) {
        if (dailyBreakdown[key].day === day) {
          earnings += dailyBreakdown[key].earnings;
          orders += dailyBreakdown[key].orders;
        }
      }

      let incentive = 0;
      if (orders >= 3) incentive = 100;
      if (orders >= 6) incentive = 250;
      if (orders >= 10) incentive = 500;

      return {
        day: day.substring(0, 3),
        earnings: Number(earnings),
        trip_earnings: Number(earnings),
        incentives: Number(incentive),
        login_hours: 0,
        orders: Number(orders),
      };
    });

    const totalIncentives = weekly.reduce((sum, item) => sum + item.incentives, 0);
    const totalEarnings = totalTripEarnings + totalIncentives;

    // Fetch today's date in YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];
    const todayStats = dailyBreakdown[todayStr] || { orders: 0, earnings: 0 };

    res.status(200).json({
      success: true,
      earnings: {
        today_orders: todayStats.orders,
        today_earnings: todayStats.earnings,
        total_earnings: totalEarnings,
        trip_earnings: totalTripEarnings,
        incentives: totalIncentives,
        login_hours: loginHours,
        completed_orders: completedOrders,
        payout_balance: totalEarnings,
        weekly,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

module.exports = {
  getEarnings,
};
