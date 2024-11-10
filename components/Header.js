// components/Header.js
import Link from 'next/link';
import { Home, Users } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-transparent">
      <div className="max-w-7xl mx-auto mt-2 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 md:justify-start md:space-x-10">
          <div className="flex justify-start lg:w-0 lg:flex-1">
            <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center">
              <Home className="h-6 w-6 mr-2" />
              <span className="font-bold">Herd Game</span>
            </Link>
          </div>         
        
        </div>
      </div>
    </header>
  );
}