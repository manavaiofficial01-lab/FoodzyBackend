const db =
  require('../../config/dbPromise');


// GET PROFILE
const getProfile =
  async (req, res) => {

    try {

      const driverId = req.user.id;

      const date =
        req.query.date;


      // DRIVER DETAILS
      const [drivers] =
        await db.query(

          `
          SELECT
          *,
          current_area

          FROM drivers

          WHERE id = ?
          `,

          [driverId]

        );


      // DRIVER NOT FOUND
      if (
        drivers.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            'Driver not found',

        });

      }


      const driver =
        drivers[0];


      // TODAY STATS
      const [stats] =
        await db.query(

          `
          SELECT

          COUNT(*) AS total_orders,

          COALESCE(
            SUM(delivery_fee),
            0
          ) AS total_earnings

          FROM orders

          WHERE assigned_driver_id = ?

          AND status = 'delivered'

          AND DATE(created_at) = ?
          `,

          [
            driverId,
            date,
          ]

        );


      const todayOrders =
        stats[0]
        .total_orders || 0;


      const todayEarnings =
        stats[0]
        .total_earnings || 0;


      // CASH COLLECTED
      const [cashData] =
        await db.query(

          `
          SELECT

          COALESCE(
            SUM(total_amount),
            0
          ) AS cash_total

          FROM orders

          WHERE assigned_driver_id = ?

          AND payment_method = 'cash'

          AND status = 'delivered'

          AND DATE(created_at) = ?
          `,

          [
            driverId,
            date,
          ]

        );


      // CASH DEPOSITED
      const [depositData] =
        await db.query(

          `
          SELECT

          COALESCE(
            SUM(amount),
            0
          ) AS deposited

          FROM cash_deposits

          WHERE driver_id = ?

          AND deposit_date = ?
          `,

          [
            driverId,
            date,
          ]

        );


      const cashCollected =

        Number(
          cashData[0]
          .cash_total || 0
        )

        -

        Number(
          depositData[0]
          .deposited || 0
        );


      const safeCashCollected =

        Math.max(
          0,
          cashCollected
        );


      // UPI COLLECTED
      const [upiData] =
        await db.query(

          `
          SELECT

          COALESCE(
            SUM(total_amount),
            0
          ) AS upi_total

          FROM orders

          WHERE assigned_driver_id = ?

          AND payment_method = 'upi'

          AND status = 'delivered'

          AND DATE(created_at) = ?
          `,

          [
            driverId,
            date,
          ]

        );


      const upiCollected =
        upiData[0]
        .upi_total || 0;


      // TARGET INCENTIVE
      let targetIncentive = 0;


      if (todayOrders >= 15) {

        targetIncentive = 800;

      }

      else if (todayOrders >= 11) {

        targetIncentive = 520;

      }

      else if (todayOrders >= 8) {

        targetIncentive = 450;

      }

      else if (todayOrders >= 6) {

        targetIncentive = 300;

      }

      else if (todayOrders >= 3) {

        targetIncentive = 180;

      }


      // LIVE LOGIN HOURS
      let liveHours = 0;


      if (driver.is_online) {

        const calculatedHours =

          Math.floor(

            (

              Date.now()

              -

              new Date(
                driver.updated_at
              ).getTime()

            )

            /

            (1000 * 60 * 60)

          );


        liveHours =

          Math.min(
            24,
            calculatedHours
          );

      }


      const totalLoginHours =

        driver.login_hours +
        liveHours;


      // HOURLY INCENTIVE
      const hourlyIncentive =

        totalLoginHours * 20;


      // FINAL RESPONSE
      res.status(200).json({

        success: true,

        profile: {

          ...driver,

          current_area:
            driver.current_area,

          today_orders:
            todayOrders,

          total_orders:
            todayOrders,

          today_earnings:
            todayEarnings,

          cash_collected:
            safeCashCollected,

          upi_collected:
            upiCollected,

          target_incentive:
            targetIncentive,

          daily_incentive:
            targetIncentive,

          hourly_incentive:
            hourlyIncentive,

          login_hours:
            totalLoginHours,

        },

      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        success: false,

        message:
          'Server Error',

      });

    }

};


// UPDATE PROFILE
const updateProfile =
  async (req, res) => {

    try {

      const driverId = req.user.id;

      const {

        full_name,

        profile_image,

      } = req.body;


      // VALIDATION
      if (

        !full_name ||

        full_name.trim() === ''

      ) {

        return res.status(400)

        .json({

          success: false,

          message:
            'Name required',

        });

      }


      // UPDATE PROFILE
      await db.query(

        `
        UPDATE drivers

        SET

        full_name = ?,

        profile_image = ?

        WHERE id = ?
        `,

        [

          full_name,

          profile_image,

          driverId,

        ]

      );


      res.status(200).json({

        success: true,

        message:
          'Profile updated',

      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        success: false,

        message:
          'Server Error',

      });

    }

};


// DEPOSIT CASH
const depositCash =
  async (req, res) => {

    try {

      const driverId = req.user.id;

      const {
        amount,
      } = req.body;


      // VALIDATION
      if (

        !amount ||

        amount <= 0

      ) {

        return res.status(400)

        .json({

          success: false,

          message:
            'Invalid amount',

        });

      }


      // INSERT DEPOSIT
      await db.query(

        `
        INSERT INTO cash_deposits (

        driver_id,

        amount,

        deposit_date

        )

        VALUES (?, ?, CURDATE())
        `,

        [

          driverId,

          amount,

        ]

      );


      res.status(200).json({

        success: true,

        message:
          'Cash deposited successfully',

      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        success: false,

        message:
          'Server Error',

      });

    }

};

module.exports = {

  getProfile,

  updateProfile,

  depositCash,

};
