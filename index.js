const listObjects = ((config = {}) => {
	let settings = {};

	const defaults = { excludedObjects: [], bucketName: null };

	settings = Object.assign(settings, defaults);
	settings = Object.assign(settings, config);

	// `bucket` is required because we cannot always infer the bucket name from
	// the URL. (e.g. a vanity DNS URL like `http://myfiles.com/`)
	settings.bucketName === null && assert('Bucket name must be specified!');

	// Templates for our UI.
	const template = $('#template-s3object').html();
	const render   = Handlebars.compile(template);

	// Current path (e.g. `/` or `/subdir/`).
	const currentPath = document.location.pathname || '';

	// Variables for our S3 REST query.
	const restURL = `http://${settings.bucketName}.s3.amazonaws.com`;
	const query   = { 'list-type': 2, 'prefix': currentPath.substr(1)};

	// Call the API and update the view with the parsed results.
	$.get(restURL, query).done((res) => {
		$('tbody').html(parseResponse(res).map((object) => render(object)));
	});

	// Parse the response from S3, which is in XML.
	function parseResponse(xmlDoc) {
		let objects = [];
		let dirs    = {};

		// S3 will not list "directories" like a normal file system. Rather, it
		// lists files with path prefixes.
		//
		// Contents => [file1.txt, subdir/file2.txt, subdir/file3.txt]
		//
		// Note that `subdir` is not in the list above. Only objects (files) are
		// listed, and they are listed with their prefixes (e.g. `subdir/`).
		$(xmlDoc).find('Contents').toArray().forEach((xmlContent) => {
			const $content = $(xmlContent);

			// S3 object key (path + file name).
			const key = $content.find('Key').text();

			// Parse the path info from the key.
			const parts = key.match(/(.*\/)?(.*)/);

			// `objectPath` will either be `undefined` or a prefix
			// like `subdir/`.
			const objectPath = parts[1] || '';
			const objectName = parts[2];

			// See if the object is in the current directory/path.
			const isObjectInCurrentDirectory = `/${objectPath}` === currentPath;

			// Is the object name in our list of exclusions?
			const isObjectExcluded = settings.excludedObjects.includes(objectName);

			// Track all the unique object paths, excluding the current path.
			if (!isObjectInCurrentDirectory) {
				dirs[objectPath] = ({
					date: null,
					size: 0,
					name: objectPath,
					url:  `${document.location.origin}/${objectPath}`
				});
			}

			// Ignore excluded objects names, and objects in sub-directories.
			if (isObjectExcluded || !isObjectInCurrentDirectory) {
				return;
			}

			objects.push({
				date: $content.find('LastModified').text(),
				size: $content.find('Size').text(),
				name: objectName,
				url:  `${document.location.origin}${document.location.pathname}${objectName}`
			});
		});

		// If we're not in the root directory, add a `..` dir to go up a level.
		if (currentPath !== '/') {
			dirs['..'] = {
				date: null,
				size: 0,
				name: '..',
				url:  `${document.location.origin}${document.location.pathname}..`
			};
		}

		return Object.keys(dirs).sort().map((d => dirs[d])).concat(objects);
	}

	function assert(message) { alert(message); throw new Error(message) }
});
