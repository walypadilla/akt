export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateDU = (dui) => {
  const re = /^\d{8}-\d{1}$/;
  return re.test(dui);
};

export const validateNIT = (nit) => {
  const re = /^\d{4}-\d{6}-\d{3}-\d{1}$/;
  return re.test(nit);
};