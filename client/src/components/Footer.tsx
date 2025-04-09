export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 py-4 border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 md:px-6 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>© {new Date().getFullYear()} CV Builder Assistant. Your data remains private and is never stored on our servers.</p>
      </div>
    </footer>
  );
}
