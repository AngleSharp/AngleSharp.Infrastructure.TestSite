namespace AngleSharp.TestSite.Config
{
    using System.Web.Mvc;
    using System.Web.Routing;

    public class RouteConfig
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            routes.MapRoute(
                name: "Echo",
                url: "Echo",
                defaults: new { controller = "Echo", action = "Index" }
            );

            routes.MapRoute(
                name: "Static",
                url: "static/{action}/{id}",
                defaults: new { controller = "Static" }
            );

            routes.MapRoute(
                name: "Default",
                url: "{action}/{id}",
                defaults: new { controller = "Tests", action = "Index", id = UrlParameter.Optional }
            );
        }
    }
}
