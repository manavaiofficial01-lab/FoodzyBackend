import API from './api';


// LOGIN DRIVER
export const loginDriver = async (
  phone,
  password
) => {

  try {

    const response = await API.post(
      '/auth/login',
      {
        phone,
        password,
      }
    );

    return response.data;

  } catch (error) {

    return {
      success: false,
      message:
        error.response?.data?.message ||
        'Login Failed',
    };

  }

};