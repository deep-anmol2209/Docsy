// "use client";

// import { useRef, useState } from "react";
// import { Globe, FileText, Play, Type, FileCode, Upload, X } from "lucide-react";
// import { toast } from "sonner";

// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Button } from "@/components/ui/button";
// import { ApiClientError } from "@/lib/api-client";
// import { useSources } from "@/hooks/useSource";
// import { cn } from "@/lib/utils";
// import type { SourceType } from "@/types";

// type SelectableType = SourceType;

// const TYPE_OPTIONS: Array<{ type: SelectableType; label: string; icon: typeof Globe }> = [
//   { type: "WEBSITE", label: "Website", icon: Globe },
//   { type: "PDF", label: "Upload PDF", icon: FileText },
//   { type: "YOUTUBE", label: "YouTube", icon: Play },
//   { type: "TEXT", label: "Text", icon: Type },
//   { type: "MARKDOWN", label: "Markdown", icon: FileCode },
// ];

// const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// function formatBytes(bytes: number): string {
//   const mb = bytes / (1024 * 1024);
//   return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
// }

// export function AddSourceDialog({
//   workspaceId,
//   open,
//   onOpenChange,
// }: {
//   workspaceId: string;
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
// }) {
//   const { addUrlOrTextSource, addPdfSource, isLoading, deleteSource, retrySource } = useSources(workspaceId)

//   const [selectedType, setSelectedType] = useState<SelectableType>("WEBSITE");
//   const [title, setTitle] = useState("");
//   const [url, setUrl] = useState("");
//   const [text, setText] = useState("");
//   const [file, setFile] = useState<File | null>(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const reset = () => {
//     setSelectedType("WEBSITE");
//     setTitle("");
//     setUrl("");
//     setText("");
//     setFile(null);
//   };

//   const handleFileSelect = (selected: File | null) => {
//     if (!selected) return;
//     if (selected.type !== "application/pdf") {
//       toast.error("Only PDF files are supported.");
//       return;
//     }
//     if (selected.size > MAX_FILE_SIZE_BYTES) {
//       toast.error("Maximum file size is 20 MB.");
//       return;
//     }
//     setFile(selected);
//   };

//   const isValid =
//     selectedType === "PDF"
//       ? !!file
//       : selectedType === "WEBSITE" || selectedType === "YOUTUBE"
//         ? url.trim().length > 0
//         : text.trim().length > 0;

//   const handleSubmit = () => {
//     if (!isValid) return;

//     // Close the dialog immediately — the optimistic card is already visible in the list
//     toast.success("Source added — processing now");
//     onOpenChange(false);
//     reset();

//     // Fire the mutation in the background; errors are handled via toast
//     const mutationPromise =
//       selectedType === "PDF" && file
//         ? addPdfSource.mutateAsync({ file, title: title.trim() })
//         : selectedType === "WEBSITE" || selectedType === "YOUTUBE"
//           ? addUrlOrTextSource.mutateAsync({
//               workspaceId,
//               type: selectedType,
//               content: title.trim() || undefined,
//               url: url.trim(),
//             })
//           : addUrlOrTextSource.mutateAsync({
//               workspaceId,
//               type: selectedType,
//               title: title.trim() || undefined,
//               content: text.trim(),
//             });

//     mutationPromise.catch((error) => {
//       toast.error(error instanceof ApiClientError ? error.message : "Failed to add source");
//     });
//   };

//   return (
//     <Dialog
//       open={open}
//       onOpenChange={(next) => {
//         onOpenChange(next);
//         if (!next) reset();
//       }}
//     >
//       <DialogContent className="sm:max-w-lg">
//         <DialogHeader>
//           <DialogTitle>Add sources</DialogTitle>
//           <DialogDescription>Add knowledge to this notebook.</DialogDescription>
//         </DialogHeader>

//         <div className="space-y-5">
//           <div className="grid grid-cols-5 gap-2">
//             {TYPE_OPTIONS.map((option) => (
//               <button
//                 key={option.type}
//                 type="button"
//                 onClick={() => setSelectedType(option.type)}
//                 className={cn(
//                   "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs transition-colors",
//                   selectedType === option.type
//                     ? "border-primary bg-primary/5 text-primary"
//                     : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/50",
//                 )}
//               >
//                 <option.icon className="size-4" />
//                 <span className="text-center leading-tight">{option.label}</span>
//               </button>
//             ))}
//           </div>

//           <FieldGroup>
//             {selectedType !== "PDF" && (
//               <Field>
//                 <FieldLabel htmlFor="source-title">Title (optional)</FieldLabel>
//                 <Input
//                   id="source-title"
//                   placeholder="Untitled"
//                   value={title}
//                   onChange={(event) => setTitle(event.target.value)}
//                   maxLength={255}
//                 />
//               </Field>
//             )}

//             {(selectedType === "WEBSITE" || selectedType === "YOUTUBE") && (
//               <Field>
//                 <FieldLabel htmlFor="source-url">
//                   {selectedType === "YOUTUBE" ? "YouTube URL" : "URL"}
//                 </FieldLabel>
//                 <Input
//                   id="source-url"
//                   autoFocus
//                   placeholder={selectedType === "YOUTUBE" ? "https://youtube.com/watch?v=..." : "https://..."}
//                   value={url}
//                   onChange={(event) => setUrl(event.target.value)}
//                   type="url"
//                 />
//               </Field>
//             )}

//             {(selectedType === "TEXT" || selectedType === "MARKDOWN") && (
//               <Field>
//                 <FieldLabel htmlFor="source-text">
//                   {selectedType === "MARKDOWN" ? "Markdown content" : "Text content"}
//                 </FieldLabel>
//                 <Textarea
//                   id="source-text"
//                   autoFocus
//                   placeholder={
//                     selectedType === "MARKDOWN" ? "# Paste your markdown here" : "Paste your text here"
//                   }
//                   value={text}
//                   onChange={(event) => setText(event.target.value)}
//                   rows={6}
//                 />
//               </Field>
//             )}

//             {selectedType === "PDF" && (
//               <Field>
//                 <FieldLabel>File</FieldLabel>
//                 {file ? (
//                   <div className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
//                     <FileText className="size-5 shrink-0 text-muted-foreground" />
//                     <div className="min-w-0 flex-1">
//                       <p className="truncate text-sm font-medium">{file.name}</p>
//                       <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
//                     </div>
//                     <Button
//                       type="button"
//                       variant="ghost"
//                       size="icon-sm"
//                       onClick={() => setFile(null)}
//                     >
//                       <X className="size-4" />
//                       <span className="sr-only">Remove file</span>
//                     </Button>
//                   </div>
//                 ) : (
//                   <div
//                     onDragOver={(event) => {
//                       event.preventDefault();
//                       setIsDragging(true);
//                     }}
//                     onDragLeave={() => setIsDragging(false)}
//                     onDrop={(event) => {
//                       event.preventDefault();
//                       setIsDragging(false);
//                       handleFileSelect(event.dataTransfer.files[0] ?? null);
//                     }}
//                     onClick={() => fileInputRef.current?.click()}
//                     role="button"
//                     tabIndex={0}
//                     className={cn(
//                       "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
//                       isDragging ? "border-primary bg-primary/5" : "border-border/60 hover:border-border hover:bg-muted/30",
//                     )}
//                   >
//                     <Upload className="size-5 text-muted-foreground" />
//                     <p className="text-sm">
//                       <span className="font-medium text-primary">Browse files</span>{" "}
//                       <span className="text-muted-foreground">or drag and drop</span>
//                     </p>
//                     <p className="text-xs text-muted-foreground">PDF, up to 20 MB</p>
//                     <input
//                       ref={fileInputRef}
//                       type="file"
//                       accept="application/pdf"
//                       className="hidden"
//                       onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
//                     />
//                   </div>
//                 )}
//               </Field>
//             )}
//           </FieldGroup>
//         </div>

//         <DialogFooter>
//           <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
//             Cancel
//           </Button>
//           <Button type="button" disabled={!isValid} onClick={handleSubmit}>
//             Add source
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }



"use client";

import { useRef, useState } from "react";
import { Globe, FileText, Play, Type, FileCode, Upload, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ApiClientError } from "@/lib/api-client";
import { useSources } from "@/hooks/useSource";
import { cn, isYouTubeUrl } from "@/lib/utils";
import type { SourceType } from "@/types";

type SelectableType = SourceType;

const TYPE_OPTIONS: Array<{ type: SelectableType; label: string; icon: typeof Globe }> = [
  { type: "WEBSITE", label: "Website", icon: Globe },
  { type: "PDF", label: "Upload PDF", icon: FileText },
  { type: "YOUTUBE", label: "YouTube", icon: Play },
  { type: "TEXT", label: "Text", icon: Type },
  { type: "MARKDOWN", label: "Markdown", icon: FileCode },
];

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function AddSourceDialog({
  workspaceId,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addUrlOrTextSource, addPdfSource } = useSources(workspaceId);

  const [selectedType, setSelectedType] = useState<SelectableType>("WEBSITE");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setSelectedType("WEBSITE");
    setTitle("");
    setUrl("");
    setText("");
    setFile(null);
  };

  const handleFileSelect = (selected: File | null) => {
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      toast.error("Only PDF files are supported.");
      return;
    }
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      toast.error("Maximum file size is 20 MB.");
      return;
    }
    setFile(selected);
  };

  const isValid =
    selectedType === "PDF"
      ? !!file
      : selectedType === "WEBSITE" || selectedType === "YOUTUBE"
        ? url.trim().length > 0
        : text.trim().length > 0;

 const handleSubmit = () => {
    if (!isValid) return;

    const isYoutube = isYouTubeUrl(url.trim());
    const effectiveType: SelectableType =
      (selectedType === "WEBSITE" || selectedType === "YOUTUBE") && isYoutube
        ? "YOUTUBE"
        : selectedType;

    // Close the dialog immediately — the optimistic card is already visible in the list
    toast.success("Source added — processing now");
    onOpenChange(false);
    reset();

    // Fire the mutation in the background; errors are handled via toast
    const mutationPromise =
      effectiveType === "PDF" && file
        ? addPdfSource.mutateAsync({ file, title: title.trim() })
        : effectiveType === "WEBSITE" || effectiveType === "YOUTUBE"
          ? addUrlOrTextSource.mutateAsync({
              workspaceId,
              type: effectiveType as "WEBSITE" | "YOUTUBE",
              title: title.trim() || undefined,
              url: url.trim(),
            })
          : addUrlOrTextSource.mutateAsync({
              workspaceId,
              type: effectiveType as "TEXT" | "MARKDOWN",
              title: title.trim() || undefined,
              content: text.trim(),
            });

    mutationPromise.catch((error) => {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to add source");
    });
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add sources</DialogTitle>
          <DialogDescription>Add knowledge to this notebook.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => setSelectedType(option.type)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs transition-colors",
                  selectedType === option.type
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/50",
                )}
              >
                <option.icon className="size-4" />
                <span className="text-center leading-tight">{option.label}</span>
              </button>
            ))}
          </div>

          <FieldGroup>
            {selectedType !== "PDF" && (
              <Field>
                <FieldLabel htmlFor="source-title">Title (optional)</FieldLabel>
                <Input
                  id="source-title"
                  placeholder="Untitled"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={255}
                />
              </Field>
            )}

            {(selectedType === "WEBSITE" || selectedType === "YOUTUBE") && (
              <Field>
                <FieldLabel htmlFor="source-url">
                  {selectedType === "YOUTUBE" ? "YouTube URL" : "URL"}
                </FieldLabel>
                <Input
                  id="source-url"
                  autoFocus
                  placeholder={selectedType === "YOUTUBE" ? "https://youtube.com/watch?v=..." : "https://..."}
                  value={url}
                  onChange={(event) => {
                    const newUrl = event.target.value;
                    setUrl(newUrl);
                    if (isYouTubeUrl(newUrl)) {
                      setSelectedType("YOUTUBE");
                    }
                  }}
                  type="url"
                />
              </Field>
            )}
{(selectedType === "TEXT" || selectedType === "MARKDOWN") && (
  <Field>
    <FieldLabel htmlFor="source-text">
      {selectedType === "MARKDOWN"
        ? "Markdown content"
        : "Text content"}
    </FieldLabel>

    <Textarea
      id="source-text"
      autoFocus
      placeholder={
        selectedType === "MARKDOWN"
          ? "# Paste your markdown here"
          : "Paste your text here"
      }
      value={text}
      onChange={(event) => setText(event.target.value)}
      className="max-h-48 overflow-y-auto resize-none"
    />
  </Field>
)}

            {selectedType === "PDF" && (
              <Field>
                <FieldLabel>File</FieldLabel>
                {file ? (
                  <div className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                    <FileText className="size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setFile(null)}
                    >
                      <X className="size-4" />
                      <span className="sr-only">Remove file</span>
                    </Button>
                  </div>
                ) : (
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsDragging(false);
                      handleFileSelect(event.dataTransfer.files[0] ?? null);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                      isDragging ? "border-primary bg-primary/5" : "border-border/60 hover:border-border hover:bg-muted/30",
                    )}
                  >
                    <Upload className="size-5 text-muted-foreground" />
                    <p className="text-sm">
                      <span className="font-medium text-primary">Browse files</span>{" "}
                      <span className="text-muted-foreground">or drag and drop</span>
                    </p>
                    <p className="text-xs text-muted-foreground">PDF, up to 20 MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
                    />
                  </div>
                )}
              </Field>
            )}
          </FieldGroup>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!isValid || isSubmitting} onClick={handleSubmit}>
            {isSubmitting && <Spinner className="mr-2 size-3.5" />}
            {isSubmitting ? "Adding source..." : "Add source"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}