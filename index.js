const fileType = require('file-type');
const fs = require('fs');

const { sendFax, fetchFaxStatus } = require('./fax');

(async () => {
	if (process.argv.length < 4) {
		console.error('Please pass the recipient number and the path to the PDF as arguments!');
		console.log('node index.js RECIPIENT_NUMBER PDF_DOCUMENT');
		process.exit(1);
	}

	const recipientNumber = process.argv[2];
	const filePath = process.argv[3];

	const type = fileType(fs.readFileSync(filePath));

	if (!type || type.mime !== 'application/pdf') {
		console.error('The file must be a PDF');
		process.exit(1);
	}

	console.log('Add fax to the sending queue...');
	const sendFaxResponse = await sendFax(recipientNumber, filePath);

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
