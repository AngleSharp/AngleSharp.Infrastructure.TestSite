namespace AngleSharpSubmitTest.Models
{
    using System;
    using System.Collections.Generic;

    public class FormModel
    {
        public IEnumerable<FormEntryModel> Fields { get; set; }
    }

    public class FormEntryModel
    {
        public String Name { get; set; }

        public String Value { get; set; }
    }
}