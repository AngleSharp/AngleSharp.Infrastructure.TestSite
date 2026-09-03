namespace AngleSharpSubmitTest.Controllers
{
    using System;
    using System.Linq;
    using System.Web.Mvc;

    public class StaticController : Controller
    {
        #region Headers

        [HttpGet]
        public ContentResult Css(String id)
        {
            var content = GetRandomText(4096, 16384);
            return Content(content, "text/css");
        }

        #endregion

        #region Helpers

        static String GetRandomText(Int32 minChars, Int32 maxChars)
        {
            var random = new Random();
            var source = "ABCDEFGHIJKLMNOPQRSTUVWXYZzyxwvutsrqponmlkjihgfedcba0123456789.:;+-*/ ";
            var chars = Enumerable.Range(0, random.Next(minChars, maxChars)).Select(m => source[random.Next(0, source.Length)]).ToArray();
            return new String(chars);
        }

        #endregion
    }
}