const db =
  require('../../config/dbPromise');


// UPDATE DRIVER LOCATION
const updateDriverLocation =
  async (req, res) => {

    try {

      const driverId = req.user.id;

      const {

        latitude,

        longitude,

        areaName,

      } = req.body;


      // LOG LOCATION
      console.log(
        'Latitude:',
        latitude
      );

      console.log(
        'Longitude:',
        longitude
      );

      console.log(
        'Area Name:',
        areaName
      );


      // UPDATE DRIVER LOCATION
      await db.query(

        `
        UPDATE drivers

        SET

        current_latitude = ?,

        current_longitude = ?,

        current_area = ?

        WHERE id = ?
        `,

        [
          latitude,
          longitude,
          areaName,
          driverId,
        ]

      );


      res.status(200).json({

        success: true,

        message:
          'Location Updated',

      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        success: false,

        message:
          'Server Error',

        error:
          error.message,

      });

    }

};


// ALTERNATIVE FUNCTION
const updateLocation =
  async (req, res) => {

    return updateDriverLocation(
      req,
      res
    );

};


module.exports = {

  updateDriverLocation,

  updateLocation,

};
