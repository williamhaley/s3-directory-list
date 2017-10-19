const listObjects = ((config = {}) => {
	let settings = {};

	const defaults = { excludedObjects: [], bucketName: null };

	settings = Object.assign(settings, defaults);
	settings = Object.assign(settings, config);

	// `bucket` required for vanity URLs/DNS when we cannot infer bucket name.
	settings.bucketName === null && assert('Bucket name must be specified!');

	const template   = $('#template-s3object').html();
	const render     = Handlebars.compile(template);
	const pathPrefix = (location.pathname || '').substr(1);
	const query      = `list-type=2&prefix=${pathPrefix}`;
	const restURL    = `http://${settings.bucketName}.s3.amazonaws.com/?${query}`;

	// Call the API and update the view with the parsed results.
	$.get(restURL).done((res) => {
		$('tbody').append(parseResponse(res).map((object) => render(object)));
	});

	function parseResponse(xmlDoc) {
		let objects = [];

		$(xmlDoc).find('Contents').toArray().map((element) => {
			const $element = $(element);
			const key      = $element.find('Key').text().match(/(.*\/)?(.*)/)[2];

			if (settings.excludedObjects.includes(key)) {
				return;
			}

			objects.push({
				date: $element.find('LastModified').text(),
				size: $element.find('Size').text(),
				key:  key,
				url:  `${document.location.origin}/${key}`
			});
		});

		return objects;
	}

	function assert(message) { alert(message); throw new Error(message) }
});
