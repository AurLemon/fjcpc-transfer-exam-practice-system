// src/api/api.ts

import axios from 'axios';
import config from './config';

export const verifyIdNumber = async (id_number: string) => {
  try {
    const response = await axios.post(`${config.BASE_URL}/test32UserLogin`, {
      sfz: id_number,
    });

    return response.data;
  } catch (error) {
    throw new Error('身份证验证请求失败: ' + error.message);
  }
};

export const fetchExamQuestions = async (
  courseType: number,
  userId: string,
) => {
  try {
    const response = await axios.post(`${config.BASE_URL}/getTestSjTmInfo`, {
      lxlx: courseType,
      xsid: userId,
    });
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch exam questions: ' + error.message);
  }
};
