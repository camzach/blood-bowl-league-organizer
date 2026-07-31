"use client";

import { useState } from "react";

export function SearchFilter({
  placeholder,
  onSearch,
}: {
  placeholder: string;
  onSearch: (term: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="relative flex flex-1 flex-shrink-0">
      <label htmlFor="search" className="sr-only">
        Search
      </label>
      <input
        type="text"
        className="input input-bordered w-full"
        placeholder={placeholder}
        onChange={(e) => {
          const newSearchTerm = e.target.value;
          setSearchTerm(newSearchTerm);
          onSearch(newSearchTerm); // Directly call onSearch
        }}
        value={searchTerm}
      />
    </div>
  );
}
