using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace AngleSharpSubmitTest.Models
{
    public class FilesModel
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

        public List<HttpPostedFileBase> Files
        {
            get;
            set;
        }
    }
}