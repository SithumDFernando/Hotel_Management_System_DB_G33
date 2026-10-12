import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-2 text-4xl font-semibold">Page not found</h1>
      <p className="mt-3 text-navy-500">The page you’re looking for doesn’t exist or has moved.</p>
      <Button to="/" className="mt-8">Back to home</Button>
    </div>
  );
}
