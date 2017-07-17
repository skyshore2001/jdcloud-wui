#!perl
=pod

将webcc_merge工具生成的文件重新拆分成原始单个文件。

Usage:

	perl webcc_merge.pl {file} [dir=.]

=cut

use strict;
use warnings;

my ($file, $outDir) = @ARGV;
if (!$file) {
	print "Usage: webcc_split {file} [outDir=.]\n";
	exit(1);
}
if (!$outDir) {
	$outDir = ".";
}
if (! -d $outDir) {
	print "*** not a dir: $outDir\n";
	exit(1);
}

my $fout;
open IN, $file or die "*** fail to open file: $file\n";
while (<IN>) {
	if (/WEBCC_BEGIN_FILE\s+(\S+)/) {
		my $f = $outDir . '/' . $1;
		print "=== write $f\n";
		open $fout, ">$f" or die "*** fail to write file: $f\n";
	}
	elsif (/WEBCC_END_FILE/) {
		close $fout;
		undef $fout;
	}
	elsif ($fout) {
		print $fout $_;
	}
}
close IN;

print "=== done\n";
