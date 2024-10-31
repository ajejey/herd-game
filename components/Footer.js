import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-4 px-6">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <p className="text-sm">© 2023 Herd Game. All rights reserved.</p>
        </div>
        <div className="flex items-center space-x-4">
          <p className="text-sm">Created by Ajey Nagarkatti</p>
          <Link 
            href="https://www.linkedin.com/in/ajeynagarkatti" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
          >
          </Link>
        </div>
      </div>
    </footer>
  );
}