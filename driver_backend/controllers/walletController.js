const db =
require('../../config/dbPromise');


// GET WALLET
const getWallet =
async (req, res) => {

  try {

    const driverId = req.user.id;


    // TRANSACTIONS
    const [transactions] =

    await db.query(

      `
      SELECT *

      FROM wallet_transactions

      WHERE driver_id = ?

      ORDER BY created_at DESC
      `,

      [driverId]

    );


    // TOTALS
    const [summary] =

    await db.query(

      `
      SELECT

      SUM(

        CASE

       WHEN type = 'earning'

        THEN amount

        ELSE 0

        END

      ) AS total_income,


      SUM(

CASE

WHEN type =
'cash_deduction'

THEN amount

ELSE 0

END

) AS total_deductions

      FROM wallet_transactions

      WHERE driver_id = ?
      `,

      [driverId]

    );


    const totalIncome =

      summary[0]
      .total_income || 0;


    const deductions =

      summary[0]
      .total_deductions || 0;


    const finalSalary =
totalIncome;


    // PAYOUTS
    const [payouts] =

    await db.query(

      `
      SELECT *

      FROM payout_requests

      WHERE driver_id = ?

      ORDER BY request_date DESC
      `,

      [driverId]

    );


    res.status(200).json({

      success: true,

      wallet: {

        total_income:
        totalIncome,

        deductions,

        final_salary:
        finalSalary,

        wallet_balance:
        finalSalary,

        transactions,

        payouts,

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


// REQUEST PAYOUT
const requestPayout =
async (req, res) => {

  try {

    const driverId = req.user.id;

    const {
      amount,
    } = req.body;


    await db.query(

      `
      INSERT INTO
      payout_requests

      (

      driver_id,

      amount

      )

      VALUES (?, ?)
      `,

      [

        driverId,
        amount,

      ]

    );


    res.status(200).json({

      success: true,

      message:
      'Payout Requested',

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

  getWallet,

  requestPayout,

};
