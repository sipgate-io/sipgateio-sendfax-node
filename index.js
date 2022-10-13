const fileType = require('file-type');
const fs = require('fs');

const { sendFax, fetchFaxStatus } = require('./fax');

require('dotenv').config()
const { RECIPIENT, PDF_FILE_PATH } = process.env;

(async () => {
	const type = fileType(fs.readFileSync(PDF_FILE_PATH));

	if (!type || type.mime !== 'application/pdf') {
		console.error('The file must be a PDF');
		process.exit(1);
	}

	console.log('Add fax to the sending queue...');
	const sendFaxResponse = await sendFax(RECIPIENT, PDF_FILE_PATH);

	if (sendFaxResponse && sendFaxResponse.status === 200) {
		console.log('Fax added to the sending queue.');
		const { sessionId } = sendFaxResponse.data;

		setInterval(async () => {
			const faxStatus = await fetchFaxStatus(sessionId);

			if (faxStatus) {
				console.log('Checking fax status -', new Date());
				console.log(faxStatus);

				if (faxStatus.faxStatusType === 'SENT') {
					console.log('The Fax was sent successfully.');
					process.exit(1);
				}
			} else {
				console.error('Could not get fax status.');
				process.exit(1);
			}
		}, 5000);
	}
})();
