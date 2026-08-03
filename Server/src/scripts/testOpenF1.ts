import axios from "axios";

const BASE_URL = "https://api.openf1.org/v1";

async function testOpenF1() {
  try {
    const response = await axios.get(
      `${BASE_URL}/meetings`,
      {
        params: {
          year: 2026
        }
      }
    );

    console.log(
      JSON.stringify(
        response.data,
        null,
        2
      )
    );

  } catch (error) {
    console.error(error);
  }
}

testOpenF1();