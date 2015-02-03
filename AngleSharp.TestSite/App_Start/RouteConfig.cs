using System.Web.Mvc;
using System.Web.Routing;

namespace AngleSharpSubmitTest
{
    public class RouteConfig
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            routes.MapRoute(
                name: "Default",
                url: "{action}/{id}",
                defaults: new { controller = "Tests", action = "Index", id = UrlParameter.Optional }
            );
        }
    }
}
