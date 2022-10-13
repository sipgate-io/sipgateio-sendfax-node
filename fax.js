const axios = require('axios');
const path = require('path');
const fs = require('fs');

require('dotenv').config()
const { BASE_URL, TOKEN_ID, TOKEN, FAXLINE_ID } = process.env;

const readFileAsBase64 = filePath => {
	const fileContents = fs.readFileSync(filePath);
	return Buffer.from(fileContents).toString('base64');
};

const sendFax = async (recipient, filePath) => {
	const filename = path.basename(filePath);
	const base64Content = readFileAsBase64(filePath);

	const data = {
		faxlineId: FAXLINE_ID,
		recipient,
		filename,
		base64Content,
	};

	const requestOptions = {
		baseURL: BASE_URL,
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		auth: {
			username: TOKEN_ID,
			password: TOKEN,
		},
		data,
	};

	try {
		const sendFaxResponse = await axios(`/sessions/fax`, requestOptions);
		return sendFaxResponse;
	} catch (error) {
		console.error('Error:', error.message);
		return null;
	}
};

const fetchFaxStatus = async sessionId => {
	try {
		const historyResponse = await axios(`/history/${sessionId}`, {
			baseURL: BASE_URL,
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			auth: {
				username: TOKEN_ID,
				password: TOKEN,
			},
		});
		return {
			faxStatusType: historyResponse.data.faxStatusType,
		};
	} catch (error) {
		console.error('Error:', error.message);
		return null;
	}
};

module.exports = { sendFax, fetchFaxStatus };
