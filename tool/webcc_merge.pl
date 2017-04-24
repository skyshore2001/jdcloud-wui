#!perl
use strict;
use warnings;
use File::Basename;

undef $/;
$_ = <>;
chdir("example");

if (! /WEBCC_BEGIN \s+ MERGE .*?$ (.*) ^.*WEBCC_END/xms) {
	die("cannot find WEBCC tag in file");
}
$_ = $1;
s/<!--.*?-->//gs;

my @files = /src="(.*?)"/g;
for (@files) {
	outputOne($_);
}
print "// vi: foldmethod=marker\n";

sub outputOne # ($f)
{
	my $f = $_[0];
	my $name = basename($f);
	local $/;
	open IN, $f;
	print "// ====== BEGIN_FILE $name {{{\n";
	local $_ = <IN>;
	print $_;
	print "// ====== END_FILE $name }}}\n\n";
	close IN;
}
