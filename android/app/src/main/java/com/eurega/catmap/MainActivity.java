package com.geodiari.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ConsentPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
