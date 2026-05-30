import API from './api';


// GET TODAY PROGRESS
export const getTodayProgress =
  async () => {

    try {

      const response =
        await API.get(
          '/progress/today'
        );

      return response.data;

    } catch (error) {

      console.log(error);

      return null;
    }

};


// GET AVAILABLE ORDERS
export const getAvailableOrders =
  async () => {

    try {

      const response =
        await API.get(
          '/orders/available'
        );

      return response.data;

    } catch (error) {

      console.log(error);

      return null;
    }

};


// TOGGLE ONLINE STATUS
export const toggleDriverStatus =
  async () => {

    try {

      const response =
        await API.put(
          '/session/toggle'
        );

      return response.data;

    } catch (error) {

      console.log(error);

      return null;
    }

};