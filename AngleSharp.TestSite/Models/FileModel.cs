namespace AngleSharp.TestSite.Models
{
    using System;
    using System.Web;

    public class FileModel
    {
        public String Name
        {
            get;
            set;
        }

        public Int32 Number
        {
            get;
            set;
        }

        public Boolean IsActive
        {
            get;
            set;
        }

        public HttpPostedFileBase File
        {
            get;
            set;
        }
    }
}