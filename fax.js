const axios = require('axios');
const path = require('path');
const fs = require('fs');

require('dotenv').config()

const baseUrl = 'https://api.sipgate.com/v2';

const { tokenId, token, faxlineId } = process.env;

const readFileAsBase64 = filePath => {
	const fileContents = fs.readFileSync(filePath);
	return Buffer.from(fileContents).toString('base64');
};

const sendFax = async (recipient, filePath) => {
	const filename = path.basename(filePath);
	const base64Content = readFileAsBase64(filePath);

	const data = {
		faxlineId,
		recipient,
		filename,
		base64Content,
	};

	const requestOptions = {
		baseURL: baseUrl,
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		auth: {
			username: tokenId,
			password: token,
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
			baseURL: baseUrl,
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			auth: {
				username: tokenId,
				password: token,
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
