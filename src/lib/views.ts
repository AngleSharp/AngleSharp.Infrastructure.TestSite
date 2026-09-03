import { escapeHtml, type Field } from './forms.js';

/** The shared `_Layout.cshtml` wrapper. */
export function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
</head>
<body>
${body}
<hr />
<small>AngleSharp Testpage | <a href="https://anglesharp.github.io">anglesharp.github.io</a></small>
</body>
</html>
`;
}

const validationMessage = (name: string): string =>
  `<span class="field-validation-valid" data-valmsg-for="${name}" data-valmsg-replace="true"></span>`;

const validationSummary =
  '<div class="validation-summary-valid" data-valmsg-summary="true"><ul><li style="display:none"></li></ul></div>';

/** The Name / Number / IsActive editors shared by every model form. */
function commonFields(): string {
  return `        <div class="form-group">
            <label class="control-label col-md-2" for="Name">Name</label>
            <div class="col-md-10">
                <input class="text-box single-line" id="Name" name="Name" type="text" value="" />
                ${validationMessage('Name')}
            </div>
        </div>

        <div class="form-group">
            <label class="control-label col-md-2" for="Number">Number</label>
            <div class="col-md-10">
                <input class="text-box single-line" data-val="true" data-val-number="The field Number must be a number." data-val-required="The Number field is required." id="Number" name="Number" type="number" value="" />
                ${validationMessage('Number')}
            </div>
        </div>

        <div class="form-group">
            <label class="control-label col-md-2" for="IsActive">IsActive</label>
            <div class="col-md-10">
                <input class="check-box" id="IsActive" name="IsActive" type="checkbox" value="true" /><input name="IsActive" type="hidden" value="false" />
                ${validationMessage('IsActive')}
            </div>
        </div>`;
}

function fileField(name: string, label: string, multiple: boolean): string {
  const multipleAttr = multiple ? ' multiple' : '';
  return `
        <div class="form-group">
            <label class="control-label col-md-2" for="${name}">${label}</label>
            <div class="col-md-10">
                <input type="file" name="${name}"${multipleAttr} />
                ${validationMessage(name)}
            </div>
        </div>`;
}

interface ModelFormOptions {
  title: string;
  action: string;
  subheading: string;
  submit: string;
  multipart: boolean;
  file?: { name: string; label: string; multiple: boolean };
}

/** Renders the templated model form pages (urlencode/multipart normal & file). */
export function modelForm(options: ModelFormOptions): string {
  const enctype = options.multipart ? ' enctype="multipart/form-data"' : '';
  const fileMarkup = options.file
    ? fileField(options.file.name, options.file.label, options.file.multiple)
    : '';

  const body = `<h1>${options.title}</h1>
<form action="${options.action}" method="post"${enctype}>
    <div class="form-horizontal">
        <h2>${options.subheading}</h2>
        <hr />
        ${validationSummary}
${commonFields()}${fileMarkup}

        <div class="form-group">
            <div class="col-md-offset-2 col-md-10">
                <input type="submit" value="${options.submit}" class="btn btn-default" />
            </div>
        </div>
    </div>
</form>`;

  return layout(options.title, body);
}

/** The `PostAnything` GET/POST view: echoes posted keys/values into `#result`. */
export function postAnything(model: Field[]): string {
  const items = model
    .map(
      (pair) =>
        `            <div class="item">
                <span class="key">${escapeHtml(pair.name)}</span>
                <span class="value">${escapeHtml(pair.value)}</span>
            </div>`,
    )
    .join('\n');

  const body = `<h1>PostAnything</h1>
<form action="/PostAnything" method="post">
    <div class="form-horizontal">
        <h2>Anything</h2>
        <hr />

        <div id="result">
${items}
        </div>

        <div class="form-group">
            <div class="col-md-offset-2 col-md-10">
                <input type="submit" value="Post" class="btn btn-default" />
            </div>
        </div>
    </div>
</form>`;

  return layout('PostAnything', body);
}

/** The overview page listing every available GET test page. */
export function testsIndex(getActions: string[]): string {
  const links = getActions
    .map((name) => `    <li><a href="/${name}">${name}</a></li>`)
    .join('\n');

  const body = `<h1>Available test pages</h1>
<ul>
${links}
    <li><a href="/Page">ResourceTestPage</a></li>
</ul>`;

  return layout('Index', body);
}

/** The `Echo` view: a table of parsed fields plus the raw request body. */
export function echo(fields: Field[], content: string): string {
  const rows = fields
    .map(
      (field) =>
        `        <tr>
            <th>${escapeHtml(field.name)}</th>
            <td>${escapeHtml(field.value)}</td>
        </tr>`,
    )
    .join('\n');

  const body = `<h1>Result</h1>

<table>
${rows}
</table>

<div id="input">
${escapeHtml(content)}
</div>`;

  return layout('Echo', body);
}

/** The standalone resource-loading test page (no layout). */
export function resourcePage(): string {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>AngleSharp Resource Loading</title>
    <link rel="stylesheet" type="text/css" href="/Content/style.css" />
    <link rel="stylesheet" type="text/css" href="/Content/other.css" />
</head>
<body>
    <h1>Resource Loading Test</h1>
    <img src="/Content/200w.gif" />
    <p>This page is sparse (and ugly) on purpose. It was never meant to be perceived by the human eye.</p>
    <p>Besides some actual resources, this page also contains some invalid links.</p>
    <iframe src="/" width="200" height="200"></iframe>
    <p>For example, the following image is not present.</p>
    <img src="/Content/foo.jpg" />
    <p>Also iframes without content have to be handled.</p>
    <iframe src="/Content/empty.html" width="200" height="200"></iframe>
    <p>Also from the scripts only one is available.</p>
    <script src="/Content/jquery.js"></script>
    <script src="/Content/jquery.foo.js"></script>
</body>
</html>
`;
}
