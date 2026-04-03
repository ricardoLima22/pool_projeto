import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export default function ConfirmDeleteDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  title = "Confirmar exclusão",
  description = "Tem certeza que deseja APAGAR este item? (Esta ação não pode ser desfeita)",
  confirmText = "OK",
  cancelText = "Cancelar"
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white border border-slate-100 rounded-3xl max-w-sm p-6 shadow-xl gap-0">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-800 text-lg font-bold text-left">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-500 text-sm font-medium mt-2 text-left">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-row justify-center items-center gap-3 mt-6 sm:justify-center sm:space-x-0 w-full">
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
              onOpenChange(false);
            }}
            className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-full py-3 border-0 font-bold tracking-wide transition-colors m-0 text-sm shadow-none"
          >
            {confirmText}
          </AlertDialogAction>
          <AlertDialogCancel
            className="flex-1 bg-[#2ECC71] text-white hover:bg-[#27ae60] hover:text-white rounded-full py-3 border-0 font-bold tracking-wide transition-colors mt-0 m-0 text-sm shadow-none"
            onClick={() => onOpenChange(false)}
          >
            {cancelText}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
