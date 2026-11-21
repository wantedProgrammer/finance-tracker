import { Upload, UploadIcon } from "lucide-react";
import { useCSVReader } from "react-papaparse";

import { Button } from "@/components/ui/button";

type Props = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpload: (results: any) => void;
};

export const UploadButton = ({ onUpload }: Props) => {
    const { CSVReader } = useCSVReader();

    //TODO: Add a paywall
    return (
        <CSVReader onUploadAccepted={onUpload}>
            {({ getRootProps }: { getRootProps: () => object }) => (
                <Button
                  size="sm"
                  className="full-w lg:w-auto"
                  {...getRootProps()}
                >
                    <UploadIcon className="size-4 mr-2" />
                    Import
                </Button>
            )}
        </CSVReader>
    );
};