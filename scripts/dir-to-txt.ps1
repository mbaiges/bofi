<#
.SYNOPSIS
  Aggregates content from files based on specified directories and regex filters.

.DESCRIPTION
  This script searches for files recursively in one or more directories.
  It filters this list using inclusion and exclusion regex patterns.
  It then concatenates the content of all matching files into a single
  output file, formatting each file's content with a header:
  # path/to/file.ext
  
  The final aggregated content is also copied to the clipboard.

.PARAMETER Directory
  (Required) One or more directory paths to search in recursively.
  Alias: -d

.PARAMETER Regex
  (Optional) One or more regex patterns to *include* files.
  If provided, a file's full path MUST match at least ONE of these patterns.
  If omitted, all files are included by default (before exclusion).
  Alias: -r

.PARAMETER IgnoreRegex
  (Optional) One or more regex patterns to *exclude* files.
  If a file's full path matches ANY of these patterns, it will be excluded.
  Alias: -ir

.PARAMETER OutputFile
  (Optional) The name of the .txt file to save the aggregated content.
  Defaults to ".\aggregated_content.txt".
  Alias: -o

.EXAMPLE
  .\aggregate.ps1 -d ".\src" -r "\.java$" -ir "target", "build"

  This command searches the ".\src" directory.
  It includes any file ending in ".java".
  It excludes any file whose path contains "target" or "build".
  The result is saved to "aggregated_content.txt" and copied to the clipboard.

.EXAMPLE
  .\aggregate.ps1 -d "C:\ProjectA", "C:\ProjectB" -r "\.py$", "\.md$" -o "my_python_project.txt"

  This command searches both "C:\ProjectA" and "C:\ProjectB".
  It only includes files ending in ".py" or ".md".
  The result is saved to "my_python_project.txt" and copied to the clipboard.

.EXAMPLE
  .\aggregate.ps1 -d "." -ir "\.git", "\.vs", "node_modules"

  This command searches the current directory (.).
  It includes all files (since -r is omitted).
  It excludes any file whose path contains ".git", ".vs", or "node_modules".
  This is useful for grabbing all project files except for common ignored ones.
#>
param (
    [Parameter(Mandatory=$true)]
    [Alias('d')]
    [string[]]$Directory,

    [Parameter(Mandatory=$false)]
    [Alias('r')]
    [string[]]$Regex,

    [Parameter(Mandatory=$false)]
    [Alias('ir')]
    [string[]]$IgnoreRegex,

    [Parameter(Mandatory=$false)]
    [Alias('o')]
    [string]$OutputFile = ".\aggregated_content.txt"
)

# Use Write-Verbose for detailed logging. Run with -Verbose to see.
Write-Verbose "Starting file aggregation..."

$allFiles = @()

# 1. Get all files from all specified directories
foreach ($dir in $Directory) {
    if (Test-Path -Path $dir -PathType Container) {
        Write-Verbose "Searching in directory: $dir"
        # Get-ChildItem gets all files recursively. -ErrorAction SilentlyContinue ignores permission errors.
        $allFiles += Get-ChildItem -Path $dir -Recurse -File -ErrorAction SilentlyContinue
    } else {
        Write-Warning "Directory not found or is not a directory: $dir"
    }
}

# 2. Get unique files (in case directories overlapped)
$uniqueFiles = $allFiles | Sort-Object -Property FullName -Unique
Write-Verbose "Found $($uniqueFiles.Count) unique files."

$filteredFiles = @()

# 3. Filter the files
foreach ($file in $uniqueFiles) {
    $filePath = $file.FullName
    $include = $true # Assume included unless -Regex is specified

    # --- Inclusion Logic ---
    # If -Regex is provided, the file must match at least one pattern.
    if ($PSBoundParameters.ContainsKey('Regex')) {
        $include = $false # Now we require an explicit match
        foreach ($r in $Regex) {
            if ($filePath -match $r) {
                $include = $true
                break # Matched one, no need to check others
            }
        }
    }

    # --- Exclusion Logic ---
    # If the file is a candidate for inclusion, check if it should be excluded.
    if ($include -and $PSBoundParameters.ContainsKey('IgnoreRegex')) {
        foreach ($ir in $IgnoreRegex) {
            if ($filePath -match $ir) {
                $include = $false # Matched an exclusion pattern
                Write-Verbose "Excluding (ignore regex): $filePath"
                break # Excluded, no need to check other ignore patterns
            }
        }
    }

    if ($include) {
        $filteredFiles += $file
    }
}

Write-Verbose "Found $($filteredFiles.Count) files after filtering."

# 4. Aggregate content
$finalContent = @()
foreach ($file in $filteredFiles) {
    try {
        # Get a clean relative path, using forward slashes like the example
        $relativePath = (Resolve-Path -Path $file.FullName -Relative).TrimStart(".\")
        $header = "# $($relativePath.Replace('\', '/'))"
        
        Write-Verbose "Adding file: $header"
        
        $fileContent = Get-Content -Path $file.FullName -Raw -ErrorAction Stop

        $finalContent += $header
        $finalContent += $fileContent
        $finalContent += "" # Add a blank line for separation
    } catch {
        Write-Warning "Could not read file: $($file.FullName) - $_"
    }
}

# 5. Save to file and copy to clipboard
$finalString = $finalContent -join [System.Environment]::NewLine
Set-Content -Path $OutputFile -Value $finalString -Encoding UTF8
$finalString | Set-Clipboard

# 6. Final Report
Write-Host "---"
Write-Host "Success! Aggregated content from $($filteredFiles.Count) files." -ForegroundColor Green
Write-Host "Output saved to: $(Resolve-Path $OutputFile)"
Write-Host "Content has been copied to your clipboard."