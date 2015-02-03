using AngleSharpSubmitTest.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace AngleSharpSubmitTest.Controllers
{
    public class TestsController : Controller
    {
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

        #endregion

        #region Helpers

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