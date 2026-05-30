const db = require('../../config/dbPromise');

const toggleOnlineStatus = async (req, res) => {
  try {
    const driverId = req.user.id;

    const [driverData] = await db.query(
      'SELECT phone, is_online FROM drivers WHERE id = ?',
      [driverId]
    );

    if (driverData.length === 0) {
      return res.status(404).json({
        message: 'Driver not found',
      });
    }

    const currentStatus = driverData[0].is_online;
    const newStatus = !currentStatus;

    // Update drivers table
    await db.query(
      'UPDATE drivers SET is_online = ?, status = ? WHERE id = ?',
      [newStatus, newStatus ? 'online' : 'offline', driverId]
    );

    if (newStatus) {
      await db.query(
        `INSERT INTO driver_sessions
        (driver_id, is_online, login_time)
        VALUES (?, ?, NOW())`,
        [driverId, true]
      );
    } else {
      await db.query(
        `UPDATE driver_sessions
         SET logout_time = NOW()
         WHERE driver_id = ?
         ORDER BY id DESC
         LIMIT 1`,
         [driverId]
      );
    }

    res.json({
      success: true,
      is_online: newStatus,
      message: newStatus
        ? 'Driver Online'
        : 'Driver Offline',
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: 'Server Error',
    });
  }
};

module.exports = {
  toggleOnlineStatus,
};
