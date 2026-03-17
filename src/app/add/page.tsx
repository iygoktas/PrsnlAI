'use client';

import { redirect } from 'next/navigation';

/**
 * Add content page — redirects to home where modal form is available
 */
export default function AddPage() {
  redirect('/');
}
