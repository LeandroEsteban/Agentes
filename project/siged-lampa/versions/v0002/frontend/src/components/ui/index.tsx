import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export const Button = ({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => <button className={className} {...props} />;
export const IconButton = ({ label, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) => <button className={`icon-button ${className}`} aria-label={label} {...props} />;
export const Card = ({ className = '', ...props }: HTMLAttributes<HTMLElement>) => <section className={`card ${className}`} {...props} />;
export const SectionCard = Card;
export const Avatar = ({ children, className = '' }: { children: ReactNode; className?: string }) => <span className={`avatar ${className}`}>{children}</span>;
export const StatusBadge = ({ children, className = '' }: { children: ReactNode; className?: string }) => <span className={`badge ${className}`}>{children}</span>;
export const SearchInput = (props: InputHTMLAttributes<HTMLInputElement>) => <input type="search" aria-label="Buscar" placeholder="Buscar" {...props} />;
export const PageHeader = ({ title, description }: { title: string; description?: string }) => <header className="page-header"><h1>{title}</h1>{description && <p>{description}</p>}</header>;
export const Breadcrumb = ({ children }: { children: ReactNode }) => <nav aria-label="Migas de pan">{children}</nav>;
