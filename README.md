<img src="https://www.sipgatedesign.com/wp-content/uploads/wort-bildmarke_positiv_2x.jpg" alt="sipgate logo" title="sipgate" align="right" height="112" width="200"/>

# sipgate.io Node.js send fax example

In this example we demonstrate how to send a fax via the `/sessions/fax` endpoint of the sipgate REST API.

For further information on the sipgate REST API please visit our [Website](https://api.sipgate.com/v2/doc).

## Prerequisites

- Node.js >= 10.15.3

### How To Use

Install dependencies:

```bash
npm install
```

## Configuration

The [config.json](./config.json) file located in the project root directory contains several placeholder values `YOUR_SIPGATE_TOKEN_ID`, `YOUR_SIPGATE_TOKEN`, and `YOUR_SIPGATE_FAXLINE_EXTENSION`. Please replace these placeholders with your actual credentials.

```json
...
"tokenId": "YOUR_SIPGATE_TOKEN_ID",
"token": "YOUR_SIPGATE_TOKEN",
"faxlineId": "YOUR_SIPGATE_FAXLINE_EXTENSION",
...
```

The token must have the `sessions:fax:write` scope.
For more information on personal access tokens visit our [website.](https://www.sipgate.io/rest-api/authentication#personalAccessToken)

The `faxlineId` uniquely identifies the extension (or virtual fax machine) from which you wish to send your fax. Refer to the [Fax Extensions](#fax-extensions) section for more information.

## Starting the application:

```bash
node index.js <RECIPIENT> <PDF_DOCUMENT>
```

## How It Works

In our main script, index.js, we make sure that the user passes the phone number of a recipient and a PDF document as arguments.

```javascript
if (process.argv.length < 4) {
  console.error(
    "Please pass the recipient number and the path to the PDF as arguments!"
  );
  console.log("node index.js RECIPIENT_NUMBER PDF_DOCUMENT");
  process.exit(1);
}

const recipientNumber = process.argv[2];
const filePath = process.argv[3];

const type = fileType(fs.readFileSync(filePath));

if (!type || type.mime !== "application/pdf") {
  console.error("The file must be a PDF");
  process.exit(1);
}
```

To ensure that the file that is passed is a PDF document we use the `file-type` module and verify that the mime-type of the file is `application/pdf`.

Now, the `sendFax`,  located in the [fax.js](./fax.js), function is called and the `recipient` and the `filePath` are passed as arguments.

```javascript
const sendFaxResponse = await sendFax(recipient, filePath);
```

In the `sendFax` function, we then save the filename of the supplied file to the constant `filename`.

```javascript
const filename = path.basename(filePath);
const base64Content = readFileAsBase64(filePath);
```

Afterwards we call the `readFileAsBase64` function which reads the file contents and encodes it to Base64.

```javascript
const readFileAsBase64 = (filePath) => {
  const fileContents = fs.readFileSync(filePath);
  return Buffer.from(fileContents).toString("base64");
};
```

Then, we create the data object which contains the `faxlineId`, `recipient`, `filename`, and `base64Content`.

```javascript
const data = {
  faxlineId,
  recipient,
  filename,
  base64Content,
};
```

We use the axios package for requests. 
The`requestOptions` object contains the parameters `method`, `headers`, `auth`, `baseURL` and `data` (previously referred) which will be used by axios in order to send the desired http post request. The `auth` property takes a username and password and generates an HTTP Basic Auth header (for more information on Basic Auth see our [code example](https://github.com/sipgate/sipgateio-basicauth-node)).

```javascript
...
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
...
```

The `axios` instance takes the request URL and `requestOptions` as arguments and process the desired http request. The request URL consists of the base URL defined above and the endpoint `/sessions/fax`.

Next we verify that the status of our `sendFaxResponse` is 200, which means that the request to send the fax was received successfully.
**Note:** Although the Api returns the status 200 it does not mean that the fax was sent. It was only added to a queue for sending.

To check the status of the fax we use the `sessionId`, returned by the `sendFax` function, and pass it to the `fetchFaxStatus` function. In this example we use `setInterval` to check the status of the fax every five seconds.

```javascript
if (sendFaxResponse && sendFaxResponse.status === 200) {
  console.log("Fax added to the sending queue.");

  const { sessionId } = sendFaxResponse.data;

  setInterval(async () => {
    const faxStatus = await fetchFaxStatus(sessionId);

    if (faxStatus) {
      console.log("Checking fax status -", new Date());
      console.log(faxStatus);

      if (faxStatus.faxStatusType === "SENT") {
        console.log("The Fax was sent successfully.");
        process.exit(1);
      }
    } else {
      console.error("Could not get fax status.");
      process.exit(1);
    }
  }, 5000);
}
```

In the `fetchFaxStatus` function we use axios again to query the `/history/{sessionId}` endpoint to get the history entry for our fax. In this case we are only interested in the `faxStatusType`.

```javascript
const fetchFaxStatus = async (sessionId) => {
  try {
    const historyResponse = await axios(`/history/${sessionId}`, {
      baseURL: baseUrl,
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
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
    console.error("Error:", error.message);
    return null;
  }
};
```

The `faxStatusType` can contain the following values:

- `PENDING`: The fax was added to the queue for sending, but the sending process has not started yet
- `SENDING`: The fax is currently being sent
- `FAILED`: The fax could not be sent
- `SENT`: The fax was sent successfully
- `SCHEDULED`: The fax is scheduled for sending at the specified timestamp (it is not `PENDING` because it is not waiting in the queue of faxes to be sent yet)

### Fax Extensions

A Fax extension consists of the letter 'f' followed by a number (e.g. 'f0'). The sipgate API uses the concept of Fax extensions to identify devices within your account that are enabled to send Fax. In this context the term 'device' does not necessarily refer to a hardware Fax but rather a virtual representation.

You can find out what your Fax extension is as follows:

1. Log into your [sipgate account](https://app.sipgate.com/w0/routing)
2. Use the sidebar to navigate to the **Routing** (_Telefonie_) tab
3. Click on any **Fax** device in your routing table
4. Select any option (gear icon) to open the corresponding menu
5. The URL of the page should have the form `https://app.sipgate.com/w0/routing/dialog/{option}/{faxlineId}` where `{faxlineId}` is your Fax extension.

### Common Issues

#### Fax added to the sending queue, but sending failed

Possible reasons are:

- PDF file not encoded correctly in base64
- PDF file with text fields or forms are not supported
- PDF file is corrupt

#### HTTP Errors

| reason                                                                                                                                                | errorcode |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | :-------: |
| bad request (e.g. request body fields are empty or only contain spaces, timestamp is invalid etc.)                                                    |    400    |
| tokenId and/or token are wrong                                                                                                                        |    401    |
| your account balance is insufficient                                                                                                                  |    402    |
| no permission to use specified Fax extension (e.g. Fax feature not booked or user password must be reset in [web app](https://app.sipgate.com/login)) |    403    |
| wrong REST API endpoint                                                                                                                               |    404    |
| wrong request method                                                                                                                                  |    405    |
| invalid recipient fax number                                                                                                                          |    407    |
| wrong or missing `Content-Type` header with `application/json`                                                                                        |    415    |
| internal server error or unhandled bad request                                                                                                        |    500    |

### Related

- [axios](https://github.com/axios/axios)
- [file-type](https://github.com/sindresorhus/file-type)

### Contact Us

Please let us know how we can improve this example.
If you have a specific feature request or found a bug, please use **Issues** or fork this repository and send a **pull request** with your improvements.

### License

This project is licensed under **The Unlicense** (see [LICENSE file](./LICENSE)).

### External Libraries

This code uses the following external libraries

- axios:
  Licensed under the [MIT License](https://opensource.org/licenses/MIT)
  Website: https://github.com/axios/axios

- file-type:
  Licensed under the [MIT License](https://opensource.org/licenses/MIT)
  Website: https://github.com/sindresorhus/file-type

---

[sipgate.io](https://www.sipgate.io) | [@sipgateio](https://twitter.com/sipgateio) | [API-doc](https://api.sipgate.com/v2/doc)
