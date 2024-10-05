pub struct Ctx<'a> {
    pub is_debug: bool,
    pub cmd_args: &'a [String],
    pub buildc_args: &'a [String],
}
