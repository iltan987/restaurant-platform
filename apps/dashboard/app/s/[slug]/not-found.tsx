export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-lg font-medium">Restoran bulunamadı</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bu adrese ait bir restoran mevcut değil ya da erişime kapalı.
        </p>
      </div>
    </div>
  )
}
