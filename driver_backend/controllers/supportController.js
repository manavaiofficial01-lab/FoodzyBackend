const db =
  require('../../config/dbPromise');


// CREATE TICKET
const createTicket =
  async (req, res) => {

    try {

      const driverId = req.user.id;

      const {
        title,
        description,
      } = req.body;


      await db.query(

        `
        INSERT INTO
        support_tickets

        (

        driver_id,
        title,
        description

        )

        VALUES (?, ?, ?)
        `,

        [
          driverId,
          title,
          description,
        ]

      );


      res.status(200).json({

        success: true,

        message:
          'Ticket created',

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


// GET TICKETS
const getTickets =
  async (req, res) => {

    try {

      const driverId = req.user.id;

      const [tickets] =
        await db.query(

          `
          SELECT *

          FROM support_tickets

          WHERE driver_id = ?

          ORDER BY created_at DESC
          `,

          [driverId]

        );


      res.status(200).json({

        success: true,

        tickets,

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

  createTicket,

  getTickets,

};
