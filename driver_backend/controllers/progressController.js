const db =
  require('../../config/dbPromise');


// GET TODAY PROGRESS
exports.getTodayProgress =
  async (req, res) => {

    try {

      const driverId = req.user.id;

      const [progress] =
        await db.query(

          `
          SELECT

          is_online,
          total_orders,
          today_earnings,
          login_hours

          FROM drivers

          WHERE id = ?
          `,

          [driverId]

        );


      res.status(200).json({

        success: true,

        progress: progress[0],

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
