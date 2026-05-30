const db =
  require('../../config/dbPromise');


// GET PAYOUTS
const getPayouts =
  async (req, res) => {

    try {

      // DRIVER ID
      const driverId = req.user.id;


      // PAYOUT HISTORY
      const [payouts] =
        await db.query(

          `
          SELECT

          id,

          payout_type,

          reference_id,

          amount,

          status,

          created_at

          FROM payout_requests

          WHERE driver_id = ?

          ORDER BY created_at DESC
          `,

          [driverId]

        );


      // TOTAL PAID
      const [paidResult] =
        await db.query(

          `
          SELECT

          COALESCE(
            SUM(amount),
            0
          ) AS total_paid

          FROM payout_requests

          WHERE driver_id = ?

          AND status = 'paid'
          `,

          [driverId]

        );


      // TOTAL PENDING
      const [pendingResult] =
        await db.query(

          `
          SELECT

          COALESCE(
            SUM(amount),
            0
          ) AS total_pending

          FROM payout_requests

          WHERE driver_id = ?

          AND status = 'pending'
          `,

          [driverId]

        );


      // RESPONSE
      res.status(200).json({

        success: true,

        payouts,

        total_paid:

          Number(

            paidResult[0]
            .total_paid || 0

          ),

        total_pending:

          Number(

            pendingResult[0]
            .total_pending || 0

          ),

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


// CREATE PAYOUT REQUEST
const createPayoutRequest =
  async (req, res) => {

    try {

      const driverId = req.user.id;


      // WALLET BALANCE
      const [wallet] =
        await db.query(

          `
          SELECT

          COALESCE(
            SUM(amount),
            0
          ) AS balance

          FROM wallet_transactions

          WHERE driver_id = ?

          AND type IN
          ('earning','incentive')
          `,

          [driverId]

        );


      const balance =

        Number(
          wallet[0].balance || 0
        );


      // ALREADY PENDING
      const [pending] =
        await db.query(

          `
          SELECT

          COALESCE(
            SUM(amount),
            0
          ) AS pending_amount

          FROM payout_requests

          WHERE driver_id = ?

          AND status = 'pending'
          `,

          [driverId]

        );


      const pendingAmount =

        Number(
          pending[0]
          .pending_amount || 0
        );


      // AVAILABLE
      const availableBalance =

        balance -
        pendingAmount;


      // CHECK
      if (

        availableBalance <= 0

      ) {

        return res.status(400)

        .json({

          success: false,

          message:
            'No balance available',

        });

      }


      // REF ID
      const referenceId =

        `PAY-${Date.now()}`;


      // INSERT REQUEST
      await db.query(

        `
        INSERT INTO payout_requests (

        driver_id,

        amount,

        payout_type,

        reference_id,

        status

        )

        VALUES (?, ?, ?, ?, ?)
        `,

        [

          driverId,

          availableBalance,

          'Weekly Settlement',

          referenceId,

          'pending',

        ]

      );


      // RESPONSE
      res.status(200).json({

        success: true,

        message:
          'Payout Request Created',

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

  getPayouts,

  createPayoutRequest,

};
