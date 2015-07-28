namespace AngleSharpSubmitTest.Controllers
{
    using AngleSharpSubmitTest.Models;
    using System.IO;
    using System.Web.Mvc;

    public class EchoController : Controller
    {
        // POST: Echo
        [HttpPost]
        public ViewResult Index()
        {
            var form = Request.Form;
            var count = form.Count;
            var reader = new StreamReader(Request.InputStream);
            var fields = new FormEntryModel[count];

            for (int i = 0; i < count; i++)
            {
                fields[i] = new FormEntryModel
                {
                    Name = form.AllKeys[i],
                    Value = form[i]
                };
            }

            return View(new FormModel
            {
                Fields = fields,
                Content = reader.ReadToEnd()
            });
        }
    }
}