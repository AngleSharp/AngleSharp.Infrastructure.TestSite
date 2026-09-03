namespace AngleSharp.TestSite.Controllers
{
    using AngleSharp.TestSite.Models;
    using System;
    using System.Collections.Generic;
    using System.IO;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;
    using System.Web;
    using System.Web.Mvc;

    public class TestsController : Controller
    {
        #region Index

        public ViewResult Index()
        {
            return View();
        }

        #endregion

        #region Urlencode

        [HttpGet]
        public ViewResult PostUrlencodeNormal()
        {
            return View();
        }

        [HttpPost]
        public ContentResult PostUrlencodeNormal(NormalModel model)
        {
            return Test(model.Name == "Test" && model.Number == 1 && model.IsActive);
        }

        [HttpGet]
        public ViewResult PostUrlencodeFile()
        {
            return View();
        }

        [HttpPost]
        public ContentResult PostUrlencodeFile(FileModel model)
        {
            return Test(model.Name == "Test" && model.Number == 1 && model.IsActive && model.File == null && Request.Form["File"] != null && Request.Form["File"] == "Filename.txt");
        }

        #endregion

        #region Multipart

        [HttpGet]
        public ViewResult PostMultipartNormal()
        {
            return View();
        }

        [HttpPost]
        public ContentResult PostMultipartNormal(NormalModel model)
        {
            return Test(model.Name == "Test" && model.Number == 1 && model.IsActive);
        }

        [HttpGet]
        public ViewResult PostMultipartFile()
        {
            return View();
        }

        [HttpPost]
        public ContentResult PostMultipartFile(FileModel model)
        {
            return Test(model.Name == "Test" && model.Number == 1 && model.IsActive && Evaluate(model.File));
        }

        [HttpGet]
        public ViewResult PostMultipartFiles()
        {
            return View();
        }

        [HttpPost]
        public ContentResult PostMultipartFiles(FilesModel model)
        {
            return Test(model.Name == "Test" && model.Number == 1 && model.IsActive && Evaluate(model.Files));
        }

        [HttpGet]
        public ViewResult PostAnything()
        {
            var emptyModel = new Dictionary<String, String>();
            return View(emptyModel);
        }

        [HttpPost]
        public ViewResult PostAnything(String _ = null)
        {
            var model = new Dictionary<String, String>();

            foreach (var key in Request.Form.AllKeys)
                model[key] = Request.Form.Get(key);

            return View(model);
        }

        #endregion

        #region Headers

        [HttpGet]
        public ContentResult Header(String id = "referer")
        {
            var value = Request.Headers[id];
            return Content(value, "text/plain");
        }

        #endregion

        #region Chunked

        [HttpGet]
        public async Task Chunked()
        {
            Write(@"<!DOCTYPE html>
<html lang=en>
<head>
<meta charset='utf-8'>
<title>Chunked transfer encoding test</title>
</head>
<body>");
            Write("<h1>Chunked transfer encoding test</h1>");
            await Task.Delay(100);
            Write("<h5>This is a chunked response after 100 ms.</h5>");
            await Task.Delay(1000);
            Write("<h5>This is a chunked response after 1 second. The server should not close the stream before all chunks are sent to a client.</h5>");
            Write("</body></html>");
            HttpContext.Response.Close();
        }

        #endregion

        #region Helpers

        void Write(String content)
        {
            var buffer = Encoding.UTF8.GetBytes(content);
            HttpContext.Response.OutputStream.Write(buffer, 0, buffer.Length);
            HttpContext.Response.Flush();
        }

        Boolean Evaluate(List<HttpPostedFileBase> files)
        {
            if (files == null)
                return false;

            if (files.Count != 5)
                return false;

            var index = 1;

            foreach (var file in files)
            {
                if (file.FileName != String.Format("Filename{0}.txt", index++) || file.ContentType != "text/plain" || file.InputStream == null)
                    return false;

                var content = Enumerable.Range(0, index * 5).Select(m => (Byte)m).ToArray();

                if (!Evaluate(file.InputStream, content))
                    return false;
            }

            return true;
        }

        Boolean Evaluate(HttpPostedFileBase file)
        {
            if (file == null)
                return false;

            if (file.FileName == "Filename.txt" && file.ContentType == "text/plain" && file.InputStream != null)
            {
                var content = new Byte[] { 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31 };
                return Evaluate(file.InputStream, content);
            }

            return false;
        }

        Boolean Evaluate(Stream stream, Byte[] content)
        {
            var index = 0;
            var recent = 0;

            while ((recent = stream.ReadByte()) != -1)
            {
                if (index >= content.Length || recent != content[index])
                    return false;

                index++;
            }

            return index == content.Length;
        }

        ContentResult Test(Boolean result)
        {
            Response.StatusCode = result ? 200 : 400;
            return Content(result ? "okay" : "error");
        }

        #endregion
    }
}